const p1 = new Promise<number>((resolve) => {
  resolve(1)
})

p1.then((data) => {
  console.warn(data)
})

// 实现一个自定义的Promise类
enum PromiseState {
  PENDING = 'pending',
  FULFILLED = 'fulfilled',
  REJECTED = 'rejected',
}

type ResolveFunction<T> = (value: T) => void
type RejectFunction = (reason?: any) => void
type ExecutorFunction<T> = (resolve: ResolveFunction<T>, reject: RejectFunction) => void
type OnFulfilledCallback<T, R> = (value: T) => R | MyPromise<R>
type OnRejectedCallback<R> = (reason: any) => R | MyPromise<R>

export class MyPromise<T> {
  private state: PromiseState = PromiseState.PENDING
  private value: T | undefined
  private reason: any
  private onFulfilledCallbacks: Array<(value: T) => void> = []
  private onRejectedCallbacks: Array<(reason: any) => void> = []

  constructor(executor: ExecutorFunction<T>) {
    if (typeof executor !== 'function') {
      throw new TypeError('Promise resolver undefined is not a function')
    }

    try {
      executor(this.resolve.bind(this), this.reject.bind(this))
    }
    catch (error) {
      this.reject(error)
    }
  }

  private resolve(value: T): void {
    if (this.state === PromiseState.PENDING) {
      this.state = PromiseState.FULFILLED
      this.value = value

      // 将fulfilled回调放入微任务队列中，异步执行所有fulfilled回调
      queueMicrotask(() => {
        this.onFulfilledCallbacks.forEach(callback => callback(value))
        this.onFulfilledCallbacks = []
      })
    }
  }

  private reject(reason: any): void {
    if (this.state === PromiseState.PENDING) {
      this.state = PromiseState.REJECTED
      this.reason = reason

      queueMicrotask(() => {
        this.onRejectedCallbacks.forEach(callback => callback(reason))
        this.onRejectedCallbacks = []
      })
    }
  }

  then<R1 = T, R2 = never>(
    onFulfilled?: OnFulfilledCallback<T, R1> | null,
    onRejected?: OnRejectedCallback<R2> | null,
  ): MyPromise<R1 | R2> {
    return new MyPromise<R1 | R2>((resolve, reject) => {
      const handleFulfilled = (value: T) => {
        try {
          if (typeof onFulfilled === 'function') {
            const result = onFulfilled(value)
            if (result instanceof MyPromise) {
              result.then(resolve, reject)
            }
            else {
              resolve(result as R1)
            }
          }
          else {
            resolve(value as unknown as R1)
          }
        }
        catch (error) {
          reject(error)
        }
      }

      const handleRejected = (reason: any) => {
        try {
          if (typeof onRejected === 'function') {
            const result = onRejected(reason)
            if (result instanceof MyPromise) {
              result.then(resolve, reject)
            }
            else {
              resolve(result as R2)
            }
          }
          else {
            reject(reason)
          }
        }
        catch (error) {
          reject(error)
        }
      }

      if (this.state === PromiseState.FULFILLED) {
        queueMicrotask(() => handleFulfilled(this.value!))
      }
      else if (this.state === PromiseState.REJECTED) {
        queueMicrotask(() => handleRejected(this.reason))
      }
      else {
        this.onFulfilledCallbacks.push(handleFulfilled)
        this.onRejectedCallbacks.push(handleRejected)
      }
    })
  }

  catch<R = never>(onRejected?: OnRejectedCallback<R> | null): MyPromise<T | R> {
    return this.then(null, onRejected)
  }

  finally(onFinally?: (() => void) | null): MyPromise<T> {
    return this.then(
      (value) => {
        if (typeof onFinally === 'function') {
          onFinally()
        }
        return value
      },
      (reason) => {
        if (typeof onFinally === 'function') {
          onFinally()
        }
        throw reason
      },
    )
  }

  // 工具方法：检查Promise状态
  isPending(): boolean {
    return this.state === PromiseState.PENDING
  }

  isFulfilled(): boolean {
    return this.state === PromiseState.FULFILLED
  }

  isRejected(): boolean {
    return this.state === PromiseState.REJECTED
  }

  // 静态方法
  static resolve<T>(value: T): MyPromise<T> {
    return new MyPromise<T>(resolve => resolve(value))
  }

  static reject<T = never>(reason?: any): MyPromise<T> {
    return new MyPromise<T>((_, reject) => reject(reason))
  }

  static all<T>(promises: Array<MyPromise<T> | T>): MyPromise<T[]> {
    return new MyPromise<T[]>((resolve, reject) => {
      const results: T[] = []
      let completedCount = 0
      const totalCount = promises.length

      if (totalCount === 0) {
        resolve(results)
        return
      }

      promises.forEach((promise, index) => {
        const p = promise instanceof MyPromise ? promise : MyPromise.resolve(promise)
        p.then(
          (value) => {
            results[index] = value
            completedCount++
            if (completedCount === totalCount) {
              resolve(results)
            }
          },
          reject,
        )
      })
    })
  }

  static race<T>(promises: Array<MyPromise<T> | T>): MyPromise<T> {
    return new MyPromise<T>((resolve, reject) => {
      promises.forEach((promise) => {
        const p = promise instanceof MyPromise ? promise : MyPromise.resolve(promise)
        p.then(resolve, reject)
      })
    })
  }
}

// 使用示例
const myPromise = new MyPromise<string>((resolve, _reject) => {
  setTimeout(() => {
    resolve('Hello, MyPromise!')
  }, 1000)
})

myPromise.then((data) => {
  console.warn('成功:', data)
  return data.toUpperCase()
}).then((upperData) => {
  console.warn('转换后:', upperData)
}).catch((error) => {
  console.error('错误:', error)
})

// 详细示例：为什么需要判断Promise状态
console.warn('\n=== Promise状态判断示例 ===')

// 情况1: Promise已经fulfilled，then方法被调用
const alreadyResolvedPromise = MyPromise.resolve('已经完成')
alreadyResolvedPromise.then((value) => {
  console.warn('情况1 - 已完成的Promise:', value)
  // 这里需要立即异步执行，因为Promise已经有结果了
})

// 情况2: Promise已经rejected，then方法被调用
const alreadyRejectedPromise = MyPromise.reject('已经拒绝')
alreadyRejectedPromise.catch((reason) => {
  console.warn('情况2 - 已拒绝的Promise:', reason)
  // 这里需要立即异步执行，因为Promise已经有拒绝原因了
})

// 情况3: Promise还在pending状态，then方法被调用
const pendingPromise = new MyPromise<string>((resolve) => {
  setTimeout(() => {
    resolve('延迟完成')
  }, 100)
})
pendingPromise.then((value) => {
  console.warn('情况3 - 等待中的Promise:', value)
  // 这里的回调需要先保存起来，等Promise完成时才执行
})

console.warn('\n=== 不同状态的处理逻辑 ===')
console.warn(`
在then方法中的状态判断：

if (this.state === PromiseState.FULFILLED) {
  // 情况1: Promise已完成
  // 立即异步执行onFulfilled回调，传入保存的value
  queueMicrotask(() => handleFulfilled(this.value!))

} else if (this.state === PromiseState.REJECTED) {
  // 情况2: Promise已拒绝
  // 立即异步执行onRejected回调，传入保存的reason
  queueMicrotask(() => handleRejected(this.reason))

} else {
  // 情况3: Promise还在等待中
  // 将回调函数保存到数组中，等状态改变时再执行
  this.onFulfilledCallbacks.push(handleFulfilled)
  this.onRejectedCallbacks.push(handleRejected)
}

这样设计的原因：
1. 保证回调执行的时机正确
2. 符合Promise/A+规范
3. 支持链式调用
4. 确保异步执行特性
`)

// 演示同一个Promise多次调用then的情况
const multiThenPromise = MyPromise.resolve('多次then测试')
multiThenPromise.then(value => console.warn('第1次then:', value))
multiThenPromise.then(value => console.warn('第2次then:', value))
multiThenPromise.then(value => console.warn('第3次then:', value))
