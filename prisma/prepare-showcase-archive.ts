import 'dotenv/config'
import { DailyCalendarService } from '../server/services/daily-contests/daily-calendar.service'
import { prepareReplayArchive } from '../server/services/showcase/replay-archive'
prepareReplayArchive(new DailyCalendarService(), 30).then(days => console.log(JSON.stringify({ verifiedDays: days.length, sourceDates: days.map(day => day.sourceDate) }))).catch(error => { console.error(error instanceof Error ? error.message : 'Archive preparation failed'); process.exitCode = 1 })
