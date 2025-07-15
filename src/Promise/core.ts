type Resolve<T = unknown> = (data: T) => void
type Reject = (reason?: any) => void
type PromiseExecutor<T = unknown> = (
  resolve: Resolve<T>,
  reject: Reject
) => void
type PromiseFulfilledCallback<T = unknown> = (data: T) => void
type PromiseRejectedCallback<T = any> = (reason: T) => void
type Microtask = (data: any) => void
type AnyFn = (...args: unknown[]) => unknown

interface PromiseLike<T = unknown> {
  then: (
    onfulfilled: PromiseFulfilledCallback<T>,
    onrejected: PromiseRejectedCallback
  ) => any
}

enum CustomPromiseState {
  PENDING = 'pending',
  FULFILLED = 'fulfilled',
  REJECTED = 'rejected',
}
const defaultFulfilled: PromiseFulfilledCallback = (data: any) => data
const defaultRejected: PromiseRejectedCallback = (reason: any) => {
  throw new Error(reason)
}

export const CustomPromiseError = {
  typeError: 'Promise resolver undefined is not a function',
  cycleError: 'Chaining cycle detected for promise #<CustomPromise>',
}

class CustomPromise<T = unknown> {
  private state = CustomPromiseState.PENDING
  private value: T | undefined
  private reason: any
  private onfulfilledCbs: Microtask[] = []
  private onrejectedCbs: Microtask[] = []
  constructor(executor: PromiseExecutor<T>) {
    if (typeof executor !== 'function') {
      warn(CustomPromiseError.typeError)
      return
    }

    try {
      // 绑定this，防止this被更改
      executor(this.onResolve.bind(this), this.onReject.bind(this))
    }
    catch (e) {
      this.onReject(e)
    }
  }

  private onResolve(data: T) {
    if (this.state !== CustomPromiseState.PENDING)
      return

    if (isPromise(data)) {
      data.then(this.onResolve.bind(this), this.onReject.bind(this))
      return
    }

    this.state = CustomPromiseState.FULFILLED
    // 缓存data，方便在then中使用
    this.value = data
    // 将fulfilled回调函数放入微任务队列中，异步执行
    addMicrotask(() => {
      this.onfulfilledCbs.forEach(task => task(data))
    })
  }

  private onReject(reason: any) {
    if (this.state !== CustomPromiseState.PENDING)
      return

    this.state = CustomPromiseState.REJECTED
    // 缓存reason，方便在then中使用
    this.reason = reason
    // 将fulfilled回调函数放入微任务队列中，异步执行
    addMicrotask(() => {
      this.onrejectedCbs.forEach(task => task(reason))
    })
  }

  then(
    onfulfilled?: PromiseFulfilledCallback<T> | null,
    onrejected?: PromiseRejectedCallback | null,
  ) {
    const onfulfilledCb: PromiseFulfilledCallback<T>
      = isFunction<PromiseFulfilledCallback>(onfulfilled)
        ? onfulfilled
        : defaultFulfilled
    const onrejectedCb: PromiseRejectedCallback = isFunction(onrejected)
      ? onrejected
      : defaultRejected
    const p = new CustomPromise((resolve, reject) => {
      if (this.state === CustomPromiseState.FULFILLED) {
        addMicrotask(() => {
          try {
            const x = onfulfilledCb(this.value!)
            resolvePromise(x, p, resolve, reject)
          }
          catch (e) {
            reject(e)
          }
        })
      }

      if (this.state === CustomPromiseState.REJECTED) {
        addMicrotask(() => {
          try {
            const x = onrejectedCb(this.reason)
            resolvePromise(x, p, resolve, reject)
          }
          catch (e) {
            reject(e)
          }
        })
      }

      if (this.state === CustomPromiseState.PENDING) {
        this.onfulfilledCbs.push((data) => {
          try {
            const x = resolve(onfulfilledCb(data))
            resolvePromise(x, p, resolve, reject)
          }
          catch (e) {
            reject(e)
          }
        })

        this.onrejectedCbs.push((reason) => {
          try {
            const x = reject(onrejectedCb(reason))
            resolvePromise(x, p, resolve, reject)
          }
          catch (e) {
            reject(e)
          }
        })
      }
    })

    return p
  }

  catch(onrejected: PromiseRejectedCallback) {
    return this.then(null, onrejected)
  }

  static resolve(value: any) {
    return new CustomPromise((resolve) => {
      resolve(value)
    })
  }

  static reject(reason: any) {
    return new CustomPromise((_, reject) => {
      reject(reason)
    })
  }

  isPending() {
    return this.state === CustomPromiseState.PENDING
  }

  isFulfilled() {
    return this.state === CustomPromiseState.FULFILLED
  }

  isRejected() {
    return this.state === CustomPromiseState.REJECTED
  }
}

/**
 * then函数的处理函数
 * @param x then函数的回调函数的返回值
 * @param p then函数返回的新的promise
 * @param resolve 新的promise的resolve
 * @param reject 新的promise的reject
 */
function resolvePromise(
  x: any,
  p: CustomPromise,
  resolve: PromiseFulfilledCallback,
  reject: PromiseRejectedCallback,
) {
  // 如果x和p相等，会造成死循环，直接抛出错误
  if (x === p) {
    const error = new TypeError(CustomPromiseError.cycleError)
    reject(error)
    return
  }

  // 设置锁，防止多次调用
  // 在thenable对象中，如果then的实现中缓存了resolve或者reject，就可以操作对resolve/reject进行多次调用，因此需要使用called防止多次调用
  let called = false
  // 判断是否是thenable对象
  if (isFunction(x) || isObject(x)) {
    try {
      // 防止获取x.then报错,或者执行then.call报错，这里需要使用try捕获
      const then = (x as PromiseLike).then
      // 如果是thenable对象，则需要先解析对象
      if (isFunction(then)) {
        then.call(
          x,
          (value: any) => {
            if (called)
              return

            called = true
            // 递归处理，直到value为非thenable对象后resolve
            resolvePromise(value, p, resolve, reject)
          },
          (reason: any) => {
            if (called)
              return

            called = true
            // reject则直接返回
            reject(reason)
          },
        )
      }
      else {
        resolve(x)
      }
    }
    catch (e) {
      // 如果在报错前promise的状态已经修改，则不需要执行reject，保证promise的状态只改变一次
      if (called)
        return

      called = true
      reject(e)
    }
  }
  else {
    resolve(x)
  }
}

function warn(msg: string) {
  throw new TypeError(msg)
}

/**
 * 添加微任务
 * @param cb 回调函数
 */
function addMicrotask(cb: () => void) {
  // 如果queueMicrotask可以使用，则使用queueMicrotask
  if (queueMicrotask) {
    queueMicrotask(cb)
    return
  }

  // 如果queueMicrotask不能使用，则使用MutationObserver
  if (typeof MutationObserver !== 'undefined') {
    const counter = 1
    const observer = new MutationObserver(() => cb())
    const textNode = document.createTextNode(String(counter))
    observer.observe(textNode, {
      characterData: true,
    })
    textNode.data = String(counter + 1)
    return
  }

  // 如果都不支持，则回退成setTimeout
  setTimeout(cb)
}

function isObject<T extends object>(target: any): target is T {
  return typeof target === 'object' && target !== null
}

export function isFunction<T extends AnyFn>(target: any): target is T {
  return typeof target === 'function'
}

/**
 * 判断一个变量是否是promise like的值
 * @param target 传入的变量
 * @returns 判断结果
 */
export function isPromise(target: any): target is PromiseLike<any> {
  return (
    (typeof target === 'object' || isFunction(target))
    && target !== null
    && isFunction(target.then)
  )
}

export default CustomPromise
