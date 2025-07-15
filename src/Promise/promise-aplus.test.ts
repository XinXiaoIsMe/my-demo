import { describe, expect, it } from 'vitest'
import { adapter } from './promise-aplus-adapter'

describe('promise A+ Compliance Tests', () => {
  it('should pass resolved test', async () => {
    const promise = adapter.resolved(42)
    const result = await promise
    expect(result).toBe(42)
  })

  it('should pass rejected test', async () => {
    const promise = adapter.rejected('error')
    await expect(promise).rejects.toBe('error')
  })

  it('should pass deferred test', async () => {
    const deferred = adapter.deferred()
    deferred.resolve(123)
    const result = await deferred.promise
    expect(result).toBe(123)
  })

  it('should handle deferred rejection', async () => {
    const deferred = adapter.deferred()
    deferred.reject('rejected')
    await expect(deferred.promise).rejects.toBe('rejected')
  })

  it('should handle chaining with resolved', async () => {
    const promise = adapter
      .resolved(1)
      .then((x: any) => x + 1)
      .then((x: any) => x * 2)
    const result = await promise
    expect(result).toBe(4)
  })

  it('should handle chaining with rejected', async () => {
    const promise = adapter
      .rejected('error')
      .then(
        () => {},
        reason => `${reason} handled`,
      )
      .then(result => result)
    const result = await promise
    expect(result).toBe('error handled')
  })

  it('should handle thenable resolution', async () => {
    const thenable = {
      then: (resolve: any) => resolve(42),
    }
    const promise = adapter.resolved(thenable)
    const result = await promise
    expect(result).toBe(42)
  })

  it('should handle promise resolution', async () => {
    const innerPromise = adapter.resolved(42)
    const promise = adapter.resolved(innerPromise)
    const result = await promise
    expect(result).toBe(42)
  })
})
