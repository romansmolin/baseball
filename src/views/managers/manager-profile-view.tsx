import { ManagerProfilePanel } from '@/widgets/showcase'
export const ManagerProfileView = ({ userId }: { userId: string }) => <div className="mx-auto w-full max-w-[1280px] px-5 py-6 sm:px-8 lg:py-10"><ManagerProfilePanel userId={userId} /></div>
