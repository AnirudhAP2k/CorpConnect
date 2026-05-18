"use client"

import { EventCard } from '@/domain/events'
import { formatDateTime } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import DeleteConfirmation from '@/components/shared/DeleteConfirmation'

interface CardProps {
    event: EventCard,
    hasOrderLink?: boolean,
    hidePrice?: boolean
}

const Card = ({ event, hasOrderLink, hidePrice }: CardProps) => {
    const { data } = useSession();

    const userId = data?.user.id as string;

    const isEventCreator = userId === event.organization?.id.toString() || false;

    return (
        <div className="group relative flex min-h-[380px] w-full max-w-[480px] flex-col overflow-hidden rounded-xl bg-white shadow-md transition-all hover:shadow-lg md:min-h-[438px]">
            <Link
                href={`/events/${event.id}`}
                style={{ background: `url(${event.image})` }}
                className="flex-center flex-grow bg-gray-50 bg-cover bg-center text-gray-500"
            >
                {event.image ? (
                    <Image
                        src={event.image}
                        alt={event.title}
                        width={480}
                        height={270}
                        className="h-full w-full object-cover object-center"
                    />
                ) : (
                    <Image
                        src="/assets/images/placeholder.png"
                        alt="placeholder"
                        width={480}
                        height={270}
                        className="h-full w-full object-cover object-center"
                    />
                )}
            </Link>
            {isEventCreator && !hidePrice && (
                <div className="absolute right-2 top-2 flex flex-col gap-4 rounded-xl bg-white p-3 shadow-sm transition-all">
                    <Link href={`/events/${event.id}/update`}>
                        <Image
                            src="/assets/icons/edit.svg"
                            alt="edit"
                            width={20}
                            height={20}
                        />
                    </Link>

                    <DeleteConfirmation eventId={event.id} />
                </div>
            )}

            <div className="flex min-h-[230px] flex-col gap-3 p-5 md:gap-4">
                {!hidePrice && <div className="flex gap-2">
                    <span className="p-semibold-14 w-min rounded-full bg-green-100 px-4 py-1 text-green-60">
                        {event.isFree ? 'FREE' : `$${event.price}`}
                    </span>
                    <p className="p-semibold-14 w-min rounded-full bbg-grey-500/10 px-4 py-1">
                        {event.category.label}
                    </p>
                </div>}

                <p className="p-medium-16 p-medium-18 text-grey-500">
                    {formatDateTime(event.startDateTime).dateTime}
                </p>

                <Link href={`/events/${event.id}`}>
                    <p className="p-medium-16 md:p-medium-20 line-clamp-2 flex-1 text-black">
                        {event.title}
                    </p>
                </Link>

                <div className='flex-between w-full'>
                    <p className='p-medium-14 md:p-medium-16 text-gray-600'>
                        {event.organization?.name}
                    </p>

                    {hasOrderLink && (
                        <Link href={`/orders?eventId=${event.id}`} className='flex gap-2'>
                            <p className='text-primary-500'>
                                Order Details
                            </p>
                            <Image
                                src="/assets/icons/arrow.svg"
                                alt="search"
                                width={10}
                                height={10}
                            />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Card