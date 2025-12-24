import React from 'react';
import Layout from '@/Layouts/Layout';
import { Head } from '@inertiajs/react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function Welcome() {
    return (
        <Layout>
            <Head title="Welcome" />
            <div className="flex justify-center mt-12">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center p-6 pb-2">
                        <CardTitle className="text-3xl font-bold">مرحباً بك في Codex</CardTitle>
                        <CardDescription className="text-lg mt-2">
                            منصة المطورين العرب المفتوحة المصدر.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 p-6 pt-2">
                        <p className="text-center text-muted-foreground">
                            تم تثبيت المشروع بنجاح مع Laravel, Bun, React, Inertia و Shadcn UI.
                        </p>
                        <div className="flex gap-2 justify-center mt-4">
                            <Button variant="default" className="cursor-pointer" asChild>
                                <a href="/auth/github/redirect">تسجيل الدخول</a>
                            </Button>
                            <Button variant="outline" className="cursor-pointer" asChild>
                                <a href="/auth/github/redirect">إنشاء حساب</a>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
