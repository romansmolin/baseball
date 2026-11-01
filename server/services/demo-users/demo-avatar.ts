import { Avatar, Style } from '@dicebear/core'
import notionists from '@dicebear/styles/notionists.json'

const style = new Style(notionists)
export function renderDemoAvatar(seed: string): string {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(seed)) throw new Error('Invalid avatar seed')
    return new Avatar(style, { seed, size: 96 }).toString()
}
