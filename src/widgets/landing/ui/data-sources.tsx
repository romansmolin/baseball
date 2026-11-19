'use client'

import Link from 'next/link'

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui'

import { DATA_PILLARS } from '../model/landing.const'

export function DataSources() {
    return (
        <section className="relative z-10 min-h-screen py-40 px-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 border-b border-white/10 pb-12">
                <div>
                    <span className="text-[10px] font-black tracking-[0.4em] uppercase text-red-500 mb-4 block">
                        02 / DATA
                    </span>
                    <h2 className="font-anton text-6xl md:text-9xl uppercase leading-[0.9] tracking-tighter">
                        BUILT ON <span className="text-outline">REAL DATA</span>
                    </h2>
                </div>
                <Link
                    href="/players"
                    className="text-white font-black uppercase tracking-[0.3em] text-[10px] hover:text-red-500 transition-colors mt-8 md:mt-0"
                >
                    Explore Players →
                </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 border border-white/10">
                {DATA_PILLARS.map((pillar) => (
                    <Card
                        key={pillar.code}
                        className="bg-[#0A0A0A] border-none rounded-none hover:bg-white/[0.02] transition-colors group p-12 ring-0"
                    >
                        <CardHeader className="p-0 mb-12">
                            <div className="flex justify-between items-start mb-8">
                                <span className="font-anton text-6xl uppercase tracking-tighter group-hover:text-red-500 transition-colors">
                                    {pillar.code}
                                </span>
                                <Badge className="bg-red-600 rounded-none font-black text-[10px] tracking-widest px-3 py-1">
                                    LIVE DATA
                                </Badge>
                            </div>
                            <CardTitle className="text-2xl font-black uppercase tracking-tight text-white mb-2">
                                {pillar.name}
                            </CardTitle>
                            <span className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase">
                                {pillar.source}
                            </span>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="mb-8 border-t border-white/10" />
                            <Link
                                href="/players"
                                className="flex w-full items-center justify-center bg-white text-black hover:bg-red-600 hover:text-white text-xs font-black uppercase tracking-[0.2em] h-14 rounded-none transition-all"
                            >
                                Browse Players
                            </Link>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    )
}
