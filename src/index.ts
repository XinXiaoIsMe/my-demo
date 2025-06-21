type Resolve<T = unknown> = (data: T) => void
type Reject = (reason?: any) => void
type PromiseExecutor<T = unknown> = (resolve: Resolve<T>, reject: Reject) => void
type PromiseFulfilledCallback<T = unknown> = (data: T) => void
type PromiseRejectedCallback<T = any> = (reason: T) => void
type Microtask = (data: any) => void

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
  typeError: 'Uncaught TypeError: Promise resolver undefined is not a function',
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

    executor((data) => {
      if (this.state === CustomPromiseState.PENDING) {
        this.state = CustomPromiseState.FULFILLED
        this.value = data
        addMicrotask(() => {
          this.onfulfilledCbs.forEach(task => task(data))
        })
      }
    }, (reason) => {
      if (this.state === CustomPromiseState.PENDING) {
        this.state = CustomPromiseState.REJECTED
        this.reason = reason
        addMicrotask(() => {
          this.onrejectedCbs.forEach(task => task(reason))
        })
      }
    })
  }

  then(onfullfilled?: PromiseFulfilledCallback<T> | null, onrejected?: PromiseRejectedCallback | null) {
    onfullfilled = typeof onfullfilled === 'function' ? onfullfilled : defaultFulfilled
    onrejected = typeof onrejected === 'function' ? onrejected : defaultRejected
    const p = new CustomPromise((resolve, reject) => {
      if (this.state === CustomPromiseState.FULFILLED) {
        addMicrotask(() => {
          onfullfilled(this.value!)
        })
      }

      if (this.state === CustomPromiseState.REJECTED) {
        addMicrotask(() => {
          onrejected(this.reason)
        })
      }

      if (this.state === CustomPromiseState.PENDING) {
        this.onfulfilledCbs.push((data) => {
          resolve(onfullfilled(data))
        })

        this.onrejectedCbs.push((reason) => {
          reject(onrejected(reason))
        })
      }
    })

    return p
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

export default CustomPromise
