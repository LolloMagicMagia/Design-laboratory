"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect temporaneo per evitare perdita dati mock su refresh.
 * Rimbalza automaticamente verso la home (o altra destinazione).
 */
export default function RedirectBack() {
    const router = useRouter();

    useEffect(() => {
        const timeout = setTimeout(() => {
            router.replace("/");
        }, 50); // Timeout breve per evitare flicker

        return () => clearTimeout(timeout);
    }, [router]);

    return <div className="p-4 text-center text-gray-500">Reindirizzamento...</div>;
}
