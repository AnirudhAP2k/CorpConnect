"use client";

import Collection from "@/components/shared/Collection";
import SkeletonCard from "@/components/SkeletonCard";
import { Button } from "@/components/ui/button";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";

const Home = () => {
    const [events, setEvents] = useState([]);
    const [totalPages, setTotalPages] = useState(0);

    const getAllEvents = useCallback(async () => {
        const params = {
            query: '',
            category: '',
            limit: 6,
            page: 1,
        }

        await axios.get("/api/events", {
            params,
        })
            .then((response) => {
                console.log(response);

                setEvents(response.data.data);
                setTotalPages(response.data.totalPages);
            })
            .catch((error) => {
                const errMessage = error.response?.data?.error || error.message;
                console.error(errMessage);
            });
    }, []);

    useEffect(() => {
        getAllEvents();
    }, [getAllEvents]);

    return (
        <>
            <section className="bg-primary-50 bg-dotted-pattern bg-contain py-5 md:py-10">
                <div className="wrapper grid grid-cols-1 md:grid-cols-2 2xl:gap-0 gap-5">
                    <div className="flex flex-col justify-center gap-8">
                        <h1 className="h1-bold">Host, Connect, Celebrate: Your Events, Our Platform</h1>
                        <p className="p-regular-20 md:p-regulat-24">
                            Book and learn helpful tips from 3,168+ mentiors in world-class companies with our global community.
                        </p>
                        <Button size="lg" asChild className="button w-full sm:w-fit">
                            <Link href="#events">
                                Explore Now
                            </Link>
                        </Button>
                    </div>

                    <Image
                        src="/assets/images/hero.png"
                        alt="hero"
                        width={1000}
                        height={1000}
                        className="max-h-[70vh] object-contain object-center 2xl:max-h-[50vh]"
                    />
                </div>
            </section>

            <section id="events" className="wrapper my-8 flex flex-col gap-8 md:gap-12">
                <h2 className="h2-bold">Trusted by <br /> Thousands of events</h2>

                <div className="flex flex-col w-full gap-5 md:flex-row">
                    Search
                    CategoryFilter
                </div>

                <Collection
                    data={events}
                    emptyTitle="No events found"
                    emptyStateSubtext="Come back later"
                    collectionType="All_events"
                    limit={6}
                    page={1}
                    totalPages={totalPages}
                />
            </section>
        </>
    );
}

export default Home;
