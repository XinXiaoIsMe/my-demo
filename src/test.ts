class CustomPromise {
  value
  reason
  state = 'pending'
  fulfilledCbs = []
  rejectedCbs = []
  constructor(executor) {
    executor(this.onResolve.bind(this), this.onReject.bind(this))
  }

  onResolve(value) {
    if (this.state !== 'pending')
      return

    this.value = value
    this.state = 'fulfilled'
    addMicrotask(() => {
      // 把then里面的回调函数添加进队列
      this.fulfilledCbs.forEach(cb => cb())
    })
  }

  onReject(reason) {
    if (this.state !== 'pending')
      return

    this.reason = reason
    this.state = 'rejected'
    addMicrotask(() => {
      // 把then里面的回调函数添加进队列
      this.rejectedCbs.forEach(cb => cb())
    })
  }

  then(onFulfilled, onRejected) {
    return new CustomPromise((resolve, reject) => {
      if (this.state === 'fulfilled') {
        addMicrotask(() => {
          const result = onFulfilled(this.value)
          resolve(result)
        })
      }

      if (this.state === 'rejected') {
        addMicrotask(() => {
          const result = onRejected(this.reason)
        })
      }

      if (this.state === 'pending') {

      }
    })
  }
}
