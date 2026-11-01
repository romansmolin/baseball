import {it,expect,afterEach,vi} from 'vitest'
import {DailyContestsController,showcaseResponse} from './daily-contests.controller'
afterEach(()=>vi.unstubAllEnvs())
it('disabled showcase does not execute database work',async()=>{vi.stubEnv('SHOWCASE_ENABLED','false');const response=await showcaseResponse(async()=>{throw new Error('must not query')});expect(response.status).toBe(404)})
it('rejects unauthenticated entry save before parsing untrusted body',async()=>{vi.stubEnv('SHOWCASE_ENABLED','true');const response=await new DailyContestsController().save('contest',null,{userId:'other'});expect(response.status).toBe(401)})
it('rejects spoofed body fields and malformed pagination',async()=>{vi.stubEnv('SHOWCASE_ENABLED','true');const controller=new DailyContestsController();const response=await controller.save('contest','user',{teamName:'Nine',userId:'victim',players:[]});expect(response.status).toBe(400);expect((await controller.list(new URLSearchParams('limit=101'))).status).toBe(400)})
