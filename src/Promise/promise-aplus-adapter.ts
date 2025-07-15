import CustomPromise from './core'

// Promise A+ 测试适配器
export const adapter = {
  resolved: (value: any) => CustomPromise.resolve(value),
  rejected: (reason: any) => CustomPromise.reject(reason),
  deferred: () => {
    let resolve: (value: any) => void
    let reject: (reason: any) => void

    const promise = new CustomPromise((res, rej) => {
      resolve = res
      reject = rej
    })

    return {
      promise,
      resolve: resolve!,
      reject: reject!,
    }
  },
}

// 为了向后兼容，也导出 defer 方法
// @ts-expect-error - Adding defer method to CustomPromise for compatibility
CustomPromise.defer = CustomPromise.deferred = function () {
  const dfd: any = {}
  dfd.promise = new CustomPromise((resolve, reject) => {
    dfd.resolve = resolve
    dfd.reject = reject
  })
  return dfd
}

export default CustomPromise
