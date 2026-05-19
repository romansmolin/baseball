import { randomBytes, scrypt } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex')
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer
    return `${salt}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [salt, hash] = storedHash.split(':')
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer
    return derivedKey.toString('hex') === hash
}
