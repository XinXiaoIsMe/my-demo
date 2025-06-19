type Executor = (resolve: (data: any) => void, reject?: (error: any) => void) => void
type CustomPromiseResolve = (data?: any) => void

class CustomPromise {
  data: any
  constructor(private executor: Executor) {
    this.init()
  }

  private init() {
    this.executor((data) => {
      this.data = data
    })
  }

  then(resolve: CustomPromiseResolve) {
    resolve(this.data)
    return this
  }
}

export default CustomPromise
