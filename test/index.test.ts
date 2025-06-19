import { describe, expect, it } from 'vitest'
import CustomPromise from '../src/index'

describe('promise', () => {
  it('should be true', () => {
    const promise = new CustomPromise((resolve) => {
      resolve(true)
    })
    promise.then((data: any) => {
      expect(data).toBe(true)
    })
  })
})
