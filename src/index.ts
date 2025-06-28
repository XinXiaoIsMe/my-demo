type Resolve<T = unknown> = (data: T) => void
type Reject = (reason?: any) => void
type PromiseExecutor<T = unknown> = (resolve: Resolve<T>, reject: Reject) => void
type PromiseFulfilledCallback<T = unknown> = (data: T) => void
type PromiseRejectedCallback<T = any> = (reason: T) => void
type Microtask = (data: any) => void
type AnyFn = (...args: unknown[]) => unknown

interface PromiseLike<T = unknown> {
  then: (onfulfilled: PromiseFulfilledCallback<T>, onrejected: PromiseRejectedCallback) => any
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

  then(onfulfilled?: PromiseFulfilledCallback<T> | null, onrejected?: PromiseRejectedCallback | null) {
    const onfulfilledCb = isFunction<PromiseFulfilledCallback>(onfulfilled) ? onfulfilled : defaultFulfilled
    const onrejectedCb = isFunction(onrejected) ? onrejected : defaultRejected
    const p = new CustomPromise((resolve, reject) => {
      if (this.state === CustomPromiseState.FULFILLED) {
        addMicrotask(() => {
          onfulfilledCb(this.value!)
        })
      }

      if (this.state === CustomPromiseState.REJECTED) {
        addMicrotask(() => {
          onrejectedCb(this.reason)
        })
      }

      if (this.state === CustomPromiseState.PENDING) {
        this.onfulfilledCbs.push((data) => {
          resolve(onfulfilledCb(data))
        })

        this.onrejectedCbs.push((reason) => {
          reject(onrejectedCb(reason))
        })
      }
    })

    return p
  }

  catch(onrejected: PromiseRejectedCallback) {
    return this.then(null, onrejected)
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

export function isFunction<T extends AnyFn>(target: any): target is T {
  return typeof target === 'function'
}

/**
 * 判断一个变量是否是promise like的值
 * @param target 传入的变量
 * @returns 判断结果
 */
export function isPromise(target: any): target is PromiseLike<any> {
  return (typeof target === 'object' || isFunction(target)) && target !== null && isFunction(target.then)
}

export default CustomPromise
