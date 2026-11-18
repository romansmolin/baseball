import { describe, expect, it } from 'vitest'

import { ProviderError } from '../../sports-provider.error'
import { mapSavantCsvToExpectedStats } from '../savant.mapper'

const HEADER =
    '"last_name, first_name","player_id","year","xba","xslg","xwoba","barrel_batted_rate","hard_hit_percent","sprint_speed"'

describe('mapSavantCsvToExpectedStats', () => {
    it('parses a BOM-prefixed header and quoted names that contain commas', () => {
        const csv = `﻿${HEADER}\n"Lowe, Nathaniel",663993,2025,".229",".373",".303",7,41.5,"26.2"\n`

        const [row] = mapSavantCsvToExpectedStats(csv, 2025, 'batter')

        expect(row).toEqual({
            externalPlayerId: 663993,
            season: 2025,
            role: 'batter',
            xba: 0.229,
            xslg: 0.373,
            xwoba: 0.303,
            barrelRate: 7,
            hardHitRate: 41.5,
            sprintSpeed: 26.2,
        })
    })

    it('turns empty values into null, never NaN', () => {
        const csv = `${HEADER}\n"Doe, Jane",1,2025,,,"",,,\n`

        const [row] = mapSavantCsvToExpectedStats(csv, 2025, 'pitcher')

        expect(row.xba).toBeNull()
        expect(row.barrelRate).toBeNull()
        expect(row.sprintSpeed).toBeNull()
        expect(row.role).toBe('pitcher')
    })

    it('skips blank lines and handles CRLF line endings', () => {
        const csv = `${HEADER}\r\n"A, B",11,2025,".1",".2",".3",1,2,3\r\n\r\n"C, D",12,2025,".4",".5",".6",4,5,6\r\n`

        const rows = mapSavantCsvToExpectedStats(csv, 2025, 'batter')

        expect(rows.map((r) => r.externalPlayerId)).toEqual([11, 12])
    })

    it('throws ProviderError when the player_id column is missing', () => {
        const csv = '"last_name, first_name","year","xba"\n"A, B",2025,".1"\n'

        expect(() => mapSavantCsvToExpectedStats(csv, 2025, 'batter')).toThrow(ProviderError)
    })

    it('returns an empty list for a header-only file', () => {
        expect(mapSavantCsvToExpectedStats(`${HEADER}\n`, 2025, 'batter')).toEqual([])
    })
})
