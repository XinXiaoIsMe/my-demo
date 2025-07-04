/* eslint-disable ts/ban-ts-comment */
/* eslint-disable test/prefer-lowercase-title */
/* eslint-disable no-new */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CustomPromise, { CustomPromiseError, isFunction, isPromise } from './core'

describe('CustomPromise', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('promise实例必须是一个包含then方法的对象', () => {
    const promise = new CustomPromise(() => { })
    expect(isPromise(promise)).toBe(true)
  })

  it('CustomPromise类必须接收一个executor函数', () => {
    let error
    try {
      // @ts-ignore
      new CustomPromise()
    }
    catch (err) {
      error = err
    }
    expect(error).toEqual(new TypeError(CustomPromiseError.typeError))
  })

  it('executor必须同步执行', () => {
    const fn = vi.fn()
    new CustomPromise(() => {
      fn()
    })
    expect(fn).toHaveBeenCalled()
  })

  it('executor必须接收resolve和reject函数', () => {
    new CustomPromise((resolve, reject) => {
      expect(isFunction(resolve)).toBe(true)
      expect(isFunction(reject)).toBe(true)
    })
  })

  it('executor函数执行报错时，promise变为rejected状态', async () => {
    const p = new CustomPromise(() => {
      throw new Error('failed')
    })
    let error
    try {
      await p
    }
    catch (e) {
      error = e
    }
    expect(p.isRejected()).toBe(true)
    expect(error).toEqual(new Error('failed'))
  })

  it('promise处于fulfilled状态时，then函数的onfulfilled回调必须接受resolve传入的值', async () => {
    const onfulfilled = vi.fn()
    const result = 'resolved'
    const promise = new CustomPromise((resolve) => {
      resolve(result)
    })
    promise.then((data) => {
      onfulfilled(data)
    })
    await nextTick()
    expect(onfulfilled).toHaveBeenCalledWith(result)
  })

  it('promise处于rejected状态时，then函数的onrejected回调必须接受reject传入的值', async () => {
    const onrejected = vi.fn()
    const reason = 'rejected'
    const promise = new CustomPromise((resolve, reject) => {
      reject(reason)
    })
    promise.then(null, (reason) => {
      onrejected(reason)
    })
    await nextTick()
    expect(onrejected).toHaveBeenCalledWith(reason)
  })

  it('promise的状态只能改变一次', async () => {
    const onResolve = vi.fn()
    const onReject = vi.fn()
    const data = 'resolved'
    const reason = 'error'
    let resolvePromise: (data: any) => void
    const promise = new CustomPromise((resolve, reject) => {
      resolvePromise = resolve
      resolve(data)
      resolve(1)
      reject(reason)
    })
    promise.then((data) => {
      onResolve(data)
    }, (reason) => {
      onReject(reason)
    })
    await nextTick()
    expect(onResolve).toHaveBeenCalledWith(data)
    expect(onResolve).toHaveBeenCalledTimes(1)
    // onrejected不会被调用
    expect(onReject).not.toHaveBeenCalled()

    await nextTick()
    // 尝试重新触发onfulfilled
    // @ts-ignore
    resolvePromise('change')
    promise.then((data) => {
      onResolve(data)
    }, (reason) => {
      onReject(reason)
    })
    await nextTick()
    // 判断onfulfilled的入参是否仍然是data
    expect(onResolve).toHaveBeenCalledWith(data)
    expect(onResolve).not.toHaveBeenCalledWith('change')
    expect(onReject).not.toHaveBeenCalled()
  })

  it('promise的then方法可以多次调用，且onfulfilled回调和onrejected回调必须按它们调用then的顺序执行', async () => {
    const onfulfilled1 = vi.fn()
    const onfulfilled2 = vi.fn()
    const onrejected1 = vi.fn()
    const onrejected2 = vi.fn()
    const fulfilledOrder: number[] = []
    const rejectedOrder: number[] = []
    const data = 'resolved'
    const reason = 'error'
    const p1 = new CustomPromise((resolve) => {
      resolve(data)
    })
    const p2 = new CustomPromise((resolve, reject) => {
      reject(reason)
    })
    p1.then((data) => {
      onfulfilled1(data)
      fulfilledOrder.push(1)
    })
    p1.then((data) => {
      onfulfilled2(data)
      fulfilledOrder.push(2)
    })
    p2.then(null, (reason) => {
      onrejected1(reason)
      rejectedOrder.push(1)
    })
    p2.then(null, (reason) => {
      onrejected2(reason)
      rejectedOrder.push(2)
    })

    await nextTick()
    // onfulfilled回调需要按照顺序执行
    expect(onfulfilled1).toHaveBeenCalledWith(data)
    expect(onfulfilled2).toHaveBeenCalledWith(data)
    expect(fulfilledOrder).toEqual([1, 2])

    // onrejected回调需要按照顺序执行
    expect(onrejected1).toHaveBeenCalledWith(reason)
    expect(onrejected2).toHaveBeenCalledWith(reason)
    expect(rejectedOrder).toEqual([1, 2])
  })

  it('onfulfilled和onrejected回调函数必须异步执行', async () => {
    const onfulfilled = vi.fn()
    const onrejected = vi.fn()
    const data = 'fulfilled'
    const reason = 'error'
    const p1 = new CustomPromise((resolve) => {
      resolve(data)
    })
    const p2 = new CustomPromise((resolve, reject) => {
      reject(reason)
    })

    p1.then((data) => {
      onfulfilled(data)
    })

    p2.then(null, (reason) => {
      onrejected(reason)
    })

    expect(onfulfilled).not.toHaveBeenCalled()
    expect(onrejected).not.toHaveBeenCalled()
    await nextTick()
    expect(p1.isFulfilled()).toBe(true)
    expect(p2.isRejected()).toBe(true)
    expect(onfulfilled).toHaveBeenCalledWith(data)
    expect(onrejected).toHaveBeenCalledWith(reason)
  })

  it('then函数必须返回一个promise', () => {
    const p = new CustomPromise((resolve) => {
      resolve(true)
    })
    const result = p.then()
    expect(isPromise(result)).toBe(true)
    expect(result.isPending()).toBe(true)
  })

  it('then函数的返回值必须作为下一个then的入参', async () => {
    const result = 'result'
    const p = new CustomPromise((resolve) => {
      resolve('')
    })
    p.then(() => result).then((d) => {
      expect(d).toBe(result)
    })
  })

  it('resolve一个promise时，需要取出这个promise的值', () => {
    const p = new CustomPromise((resolve) => {
      resolve(1)
    })

    const p2 = new CustomPromise((resolve) => {
      resolve(p)
    })

    p2.then((data) => {
      expect(data).toBe(1)
    })
  })

  it('reject一个promise时，直接将这个promise传递给onRejected', async () => {
    const p = new CustomPromise((resolve, reject) => {
      reject('error')
    })

    const p2 = new CustomPromise((resolve) => {
      resolve(p)
    })

    try {
      await p2
    }
    catch (e) {
      expect(e).toBe('error')
    }
  })

  it('promise状态为rejected时，数据需要传递到catch', async () => {
    const reason = 'error'
    const p = new CustomPromise((resolve, reject) => {
      reject(reason)
    })
    const fn = vi.fn()
    try {
      await p.catch((e) => {
        fn(e)
      })
    }
    finally {
      expect(fn).toHaveBeenCalledWith(reason)
    }
  })
})

function nextTick() {
  return Promise.resolve()
}
