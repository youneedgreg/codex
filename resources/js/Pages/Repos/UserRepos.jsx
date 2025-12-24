import React, { useState, useEffect } from 'react';
import Layout from '@/Layouts/Layout';
import { Head, Link, router, usePage, useForm } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    ArrowRight, ArrowLeft, Calendar, Github, Star, Folder, FolderPlus,
    ArrowUpDown, ChevronUp, ChevronDown, RefreshCw, AlertTriangle,
    List, LayoutGrid, Search, Filter, Plus, Edit2, Trash2, DownloadCloud, ExternalLink, Settings
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from 'sonner';

export default function UserRepos({ user, repos, filters, availableLanguages, availableFolders }) {
    const { auth } = usePage().props;
    const isOwner = auth.user && auth.user.id === user.id;

    const [viewMode, setViewMode] = useState('table');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingRepo, setEditingRepo] = useState(null);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, repoId: null });
    const [searchQuery, setSearchQuery] = useState(filters.search || '');

    // Search Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery !== (filters.search || '')) {
                router.get(
                    `/@${user.username}/repos`,
                    { ...filters, search: searchQuery },
                    { preserveState: true, preserveScroll: true }
                );
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Add Repo Form
    const { data, setData, post, processing, errors, reset } = useForm({
        url: '',
        folder: '',
        user_notes: '',
    });

    const submitRepo = (e) => {
        e.preventDefault();
        post('/repos', {
            onSuccess: () => {
                toast.success('تمت إضافة المشروع بنجاح');
                reset();
                setIsAddDialogOpen(false);
            },
            onError: () => {
                toast.error('فشل إضافة المشروع. يرجى التأكد من الرابط.');
            }
        });
    };

    const [isImporting, setIsImporting] = useState(false);
    const handleImportAll = () => {
        setIsImporting(true);
        router.post('/repos/import', {}, {
            onSuccess: () => {
                toast.success('بدأت عملية استيراد المشاريع. سيتم تحديث القائمة قريباً.');
                setIsImporting(false);
                setIsAddDialogOpen(false);
            },
            onError: () => {
                toast.error('فشل بدء الاستيراد.');
                setIsImporting(false);
            }
        });
    };

    // Edit Repo Form
    // We create a separate form instance for editing or just handle it with state if we want to be simpler? 
    // inertia useForm is bound to one form. Let's use a separate logic or reuse.
    // Better to use a separate form component or standard React state and manual router.put for simplicity in one file?
    // Let's use router.put manually for edit to avoid hook rules in loops/conditionals.

    const [editData, setEditData] = useState({ url: '', folder: '', user_notes: '' });
    const [editProcessing, setEditProcessing] = useState(false);

    const openEditDialog = (repo) => {
        setEditingRepo(repo);
        setEditData({
            url: repo.url,
            folder: repo.folder || '',
            user_notes: repo.user_notes || ''
        });
    };

    const handleUpdateRepo = (e) => {
        e.preventDefault();
        setEditProcessing(true);
        router.put(`/repos/${editingRepo.id}`, editData, {
            onSuccess: () => {
                toast.success('تم تحديث المشروع بنجاح');
                setEditingRepo(null);
                setEditProcessing(false);
            },
            onError: () => {
                toast.error('حدث خطأ أثناء التحديث');
                setEditProcessing(false);
            }
        });
    };

    const handleToggleFeature = (repoId) => {
        router.post(`/repos/${repoId}/toggle-feature`, {}, {
            preserveScroll: true,
            onSuccess: () => toast.success('تم تحديث حالة التميز'),
        });
    };

    const handleDeleteRepo = (repoId) => {
        router.delete(`/repos/${repoId}`, {
            onSuccess: () => {
                toast.success('تم حذف المشروع بنجاح');
                setDeleteDialog({ open: false, repoId: null });
            },
            onError: () => toast.error('حدث خطأ أثناء حذف المشروع'),
        });
    };

    // Filter handling
    const handleFilterChange = (key, value) => {
        router.get(
            `/@${user.username}/repos`,
            { ...filters, [key]: value },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleSort = (key) => {
        const direction = filters.sort === key && filters.direction === 'desc' ? 'asc' : 'desc';
        handleFilterChange('sort', key);
        handleFilterChange('direction', direction);
        router.get(
            `/@${user.username}/repos`,
            { ...filters, sort: key, direction },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleRefreshVerification = (repoId) => {
        router.post(`/repos/${repoId}/refresh-verification`, {}, {
            preserveScroll: true,
            onSuccess: () => toast.success('تم تحديث حالة التوثيق'),
            onError: () => toast.error('فشل تحديث حالة التوثيق'),
        });
    };

    return (
        <Layout>
            <Head title={`مشاريع ${user.name}`} />
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
                    <div className="flex items-center justify-between">
                        <Link
                            href={`/@${user.username}`}
                            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                            <div className="p-1.5 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                                <ArrowRight className="w-4 h-4 ml-0" />
                            </div>
                            <span>العودة لـ @{user.username}</span>
                        </Link>

                        {isOwner && (
                            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gap-2 cursor-pointer shadow-lg hover:shadow-xl transition-all">
                                        <Plus className="w-4 h-4" />
                                        <span>إضافة مشروع</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]" dir="rtl">
                                    <DialogHeader>
                                        <DialogTitle className="text-right">إضافة مشروع جديد</DialogTitle>
                                        <DialogDescription className="text-right">
                                            أضف رابط مشروعك من GitHub أو استورد جميع مشاريعك دفعة واحدة.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4 space-y-4">
                                        <form onSubmit={submitRepo} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="url" className="text-right block">رابط GitHub</Label>
                                                <Input
                                                    id="url"
                                                    placeholder="https://github.com/username/repo"
                                                    value={data.url}
                                                    onChange={e => setData('url', e.target.value)}
                                                    className="text-left"
                                                    dir="ltr"
                                                    required
                                                />
                                                {errors.url && <p className="text-xs text-red-500 text-right">{errors.url}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="folder" className="text-right flex items-center gap-2">
                                                    <FolderPlus className="w-4 h-4" />
                                                    المجلد (اختياري)
                                                </Label>
                                                <Input
                                                    id="folder"
                                                    placeholder="مثلاً: تطبيقات الهاتف"
                                                    value={data.folder}
                                                    onChange={e => setData('folder', e.target.value)}
                                                    maxLength={50}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="notes" className="text-right block">ملاحظاتك (اختياري)</Label>
                                                <Input
                                                    id="notes"
                                                    placeholder="ماذا تعلمت من هذا المشروع؟"
                                                    value={data.user_notes}
                                                    onChange={e => setData('user_notes', e.target.value)}
                                                    maxLength={240}
                                                />
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                <Button type="submit" disabled={processing} className="flex-1 cursor-pointer">
                                                    {processing ? 'جاري الإضافة...' : 'إضافة المشروع'}
                                                </Button>
                                            </div>
                                        </form>

                                        <div className="relative">
                                            <div className="absolute inset-0 flex items-center">
                                                <span className="w-full border-t" />
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase">
                                                <span className="bg-background px-2 text-muted-foreground">أو</span>
                                            </div>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleImportAll}
                                            disabled={isImporting}
                                            className="w-full cursor-pointer gap-2 border-primary/50 hover:bg-primary/5 hover:border-primary transition-all"
                                        >
                                            {isImporting ? (
                                                <>
                                                    <DownloadCloud className="w-4 h-4 animate-bounce" />
                                                    جاري الاستيراد...
                                                </>
                                            ) : (
                                                <>
                                                    <Github className="w-4 h-4" />
                                                    <span>استيراد الكل من GitHub</span>
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-6">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold tracking-tight">مشاريع {user.name}</h1>
                            <p className="text-muted-foreground text-lg">
                                استكشف {repos.total} مشروعاً ومكتبة برمجية.
                            </p>
                        </div>
                    </div>

                    {/* Controls & Content */}
                    <div className="space-y-6">
                        {/* Search and Filters Toolbar */}
                        <div className="flex flex-col gap-4 bg-muted/10 p-4 rounded-xl border">
                            <div className="flex flex-col md:flex-row gap-4 justify-between">
                                {/* Search */}
                                <div className="relative w-full md:w-96">
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="بحث في المشاريع..."
                                        className="pr-10 bg-background"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>

                                {/* View Mode & Count */}
                                <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                                        {repos.total} مشروع
                                    </div>
                                    <div className="flex border rounded-lg p-1 bg-background">
                                        <Button
                                            variant={viewMode === 'table' ? "secondary" : "ghost"}
                                            size="icon"
                                            className="h-8 w-8 cursor-pointer"
                                            onClick={() => setViewMode('table')}
                                            title="عرض الجدول"
                                        >
                                            <List className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant={viewMode === 'card' ? "secondary" : "ghost"}
                                            size="icon"
                                            className="h-8 w-8 cursor-pointer"
                                            onClick={() => setViewMode('card')}
                                            title="عرض البطاقات"
                                        >
                                            <LayoutGrid className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="space-y-3">
                                {/* Folders */}
                                {availableFolders.length > 0 && (
                                    <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
                                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap pl-2">المجلدات:</span>
                                        <Button
                                            variant={filters.folder === 'all' || !filters.folder ? "secondary" : "outline"}
                                            size="sm"
                                            className="h-7 text-xs rounded-full whitespace-nowrap"
                                            onClick={() => handleFilterChange('folder', 'all')}
                                        >
                                            الكل
                                        </Button>
                                        {availableFolders.map(folder => (
                                            <Button
                                                key={folder}
                                                variant={filters.folder === folder ? "secondary" : "ghost"}
                                                size="sm"
                                                className={`h-7 text-xs rounded-full whitespace-nowrap ${filters.folder === folder ? 'border-primary/20 bg-primary/10' : ''}`}
                                                onClick={() => handleFilterChange('folder', folder)}
                                            >
                                                {folder}
                                            </Button>
                                        ))}
                                    </div>
                                )}

                                {/* Languages */}
                                {availableLanguages.length > 0 && (
                                    <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
                                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap pl-2 text-left w-[46px]">اللغات:</span>
                                        <Button
                                            variant={filters.language === 'all' || !filters.language ? "secondary" : "outline"}
                                            size="sm"
                                            className="h-7 text-xs rounded-full whitespace-nowrap"
                                            onClick={() => handleFilterChange('language', 'all')}
                                        >
                                            الكل
                                        </Button>
                                        {availableLanguages.map(lang => (
                                            <Button
                                                key={lang}
                                                variant={filters.language === lang ? "secondary" : "ghost"}
                                                size="sm"
                                                className={`h-7 text-xs rounded-full whitespace-nowrap ${filters.language === lang ? 'border-primary/20 bg-primary/10' : ''}`}
                                                onClick={() => handleFilterChange('language', lang)}
                                            >
                                                {lang}
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="min-w-0">
                            {/* List View */}
                            {viewMode === 'table' ? (
                                <div className="border rounded-lg bg-card overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <Table dir="rtl" className="min-w-[800px]">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="text-right w-[1px] whitespace-nowrap">
                                                        <Button variant="ghost" size="sm" onClick={() => handleSort('name')} className="hover:bg-transparent p-0 font-bold">
                                                            المشروع
                                                            {filters.sort === 'name' && (filters.direction === 'asc' ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />)}
                                                        </Button>
                                                    </TableHead>
                                                    <TableHead className="text-right w-[1px] whitespace-nowrap">
                                                        <Button variant="ghost" size="sm" onClick={() => handleSort('language')} className="hover:bg-transparent p-0">
                                                            اللغة
                                                            {filters.sort === 'language' && (filters.direction === 'asc' ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />)}
                                                        </Button>
                                                    </TableHead>
                                                    <TableHead className="text-center w-[1px] whitespace-nowrap">
                                                        <Button variant="ghost" size="sm" onClick={() => handleSort('stars')} className="hover:bg-transparent p-0">
                                                            النجوم
                                                            {filters.sort === 'stars' && (filters.direction === 'asc' ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />)}
                                                        </Button>
                                                    </TableHead>


                                                    <TableHead className="text-left w-[1px] whitespace-nowrap">الإجراءات</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {repos.data.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                                            لا توجد مشاريع تطابق الفلتر.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    repos.data.map(repo => (
                                                        <TableRow key={repo.id} className="group">
                                                            <TableCell className="font-medium align-top">
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <a href={repo.url} target="_blank" rel="noopener noreferrer" className="font-mono text-base hover:underline text-primary">
                                                                            {repo.name}
                                                                        </a>
                                                                        {repo.is_own_repo === false && (
                                                                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px] gap-1">
                                                                                <AlertTriangle className="w-3 h-3" />
                                                                                غير موثق
                                                                            </Badge>
                                                                        )}
                                                                        {isOwner && (
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer opacity-0 group-hover:opacity-100"
                                                                                title="تحديث حالة التوثيق"
                                                                                onClick={() => handleRefreshVerification(repo.id)}
                                                                            >
                                                                                <RefreshCw className="w-3 h-3" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                    {repo.folder && (
                                                                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted w-fit px-2 py-0.5 rounded-full">
                                                                            <Folder className="w-3 h-3" />
                                                                            {repo.folder}
                                                                        </span>
                                                                    )}

                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="align-top pt-4">
                                                                {repo.language && (
                                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary">
                                                                        {repo.language}
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-center align-top pt-4">
                                                                <div className="flex items-center justify-center gap-1 text-yellow-600 font-medium">
                                                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                                                    {repo.stars}
                                                                </div>
                                                            </TableCell>


                                                            <TableCell className="text-left align-top pt-4">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                                                                        <a href={repo.url} target="_blank" rel="noopener noreferrer">
                                                                            <ExternalLink className="w-4 h-4" />
                                                                        </a>
                                                                    </Button>
                                                                    {isOwner && (
                                                                        <>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                onClick={() => handleToggleFeature(repo.id)}
                                                                                className={`h-8 w-8 rounded-full ${repo.is_featured ? 'text-amber-500 fill-amber-500 bg-amber-50' : 'text-muted-foreground opacity-20 hover:opacity-100'}`}
                                                                                title={repo.is_featured ? 'إلغاء التمييز' : 'تمييز المشروع'}
                                                                            >
                                                                                <Star className={`w-4 h-4 ${repo.is_featured ? 'fill-current' : ''}`} />
                                                                            </Button>
                                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditDialog(repo)}>
                                                                                <Edit2 className="w-4 h-4" />
                                                                            </Button>
                                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteDialog({ open: true, repoId: repo.id })}>
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </Button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                                    {repos.data.map(repo => (
                                        <Card key={repo.id} className="flex flex-col h-full hover:shadow-md transition-shadow relative overflow-hidden group">
                                            <CardHeader className="pb-3 p-6">
                                                <div className="flex justify-between items-start">
                                                    <div className="space-y-1 w-full overflow-hidden">
                                                        <div className="flex items-center justify-between">
                                                            <CardTitle className="text-base font-mono dir-ltr truncate">
                                                                <a href={repo.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                                                                    {repo.name}
                                                                </a>
                                                            </CardTitle>
                                                            <div className="flex items-center gap-1 text-[10px] text-yellow-600 font-medium bg-yellow-50 px-2 py-0.5 rounded-full shrink-0">
                                                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                                                {repo.stars}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {repo.language && (
                                                                <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full">{repo.language}</span>
                                                            )}
                                                            {repo.folder && (
                                                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                    <Folder className="w-3 h-3" />
                                                                    {repo.folder}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="flex-1 pb-4 px-6">
                                                <p className="text-sm text-muted-foreground line-clamp-3">
                                                    {repo.user_notes || <span className="text-muted-foreground/50 italic">لا توجد ملاحظات.</span>}
                                                </p>
                                            </CardContent>
                                            <CardFooter className="pt-0 border-t bg-muted/5 p-4 py-3 flex justify-between items-center px-6">
                                                <a href={repo.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                                                    <Github className="w-3 h-3" />
                                                    GitHub
                                                </a>

                                                {isOwner && (
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleToggleFeature(repo.id)}
                                                            className={`h-8 w-8 rounded-full ${repo.is_featured ? 'text-amber-500 fill-amber-500 bg-amber-50' : 'text-muted-foreground'}`}
                                                            title={repo.is_featured ? 'إلغاء التمييز' : 'تمييز المشروع'}
                                                        >
                                                            <Star className={`w-3.5 h-3.5 ${repo.is_featured ? 'fill-current' : ''}`} />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditDialog(repo)}>
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteDialog({ open: true, repoId: repo.id })}>
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            {/* Pagination */}
                            <div className="flex justify-center gap-2 pt-4">
                                {repos.prev_page_url && (
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={repos.prev_page_url} preserveState preserveScroll>السابق</Link>
                                    </Button>
                                )}
                                {repos.next_page_url && (
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={repos.next_page_url} preserveState preserveScroll>التالي</Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editingRepo} onOpenChange={(open) => !open && setEditingRepo(null)}>
                <DialogContent className="sm:max-w-[425px]" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-right">تعديل المشروع</DialogTitle>
                        <DialogDescription className="text-right">قم بتعديل بيانات المشروع أو نقله إلى مجلد آخر.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateRepo} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-url" className="text-right block">رابط GitHub</Label>
                            <Input
                                id="edit-url"
                                placeholder="https://github.com/..."
                                value={editData.url}
                                onChange={e => setEditData({ ...editData, url: e.target.value })}
                                className="text-left"
                                dir="ltr"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-folder" className="text-right block">المجلد</Label>
                            <Input
                                id="edit-folder"
                                placeholder="مثلاً: تطبيقات الهاتف"
                                value={editData.folder}
                                onChange={e => setEditData({ ...editData, folder: e.target.value })}
                                maxLength={50}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-notes" className="text-right block">ملاحظاتك</Label>
                            <Input
                                id="edit-notes"
                                value={editData.user_notes}
                                onChange={e => setEditData({ ...editData, user_notes: e.target.value })}
                                maxLength={240}
                            />
                        </div>
                        <DialogFooter className="gap-2">
                            <Button type="button" variant="outline" onClick={() => setEditingRepo(null)}>إلغاء</Button>
                            <Button type="submit" disabled={editProcessing}>{editProcessing ? 'جاري التحديث...' : 'تحديث'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
                <DialogContent className="sm:max-w-[400px]" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-right">حذف المشروع</DialogTitle>
                        <DialogDescription className="text-right">
                            هل أنت متأكد من رغبتك في حذف هذا المشروع؟ لا يمكن التراجع عن هذا الإجراء.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteDialog({ open: false, repoId: null })}>إلغاء</Button>
                        <Button variant="destructive" onClick={() => handleDeleteRepo(deleteDialog.repoId)}>حذف</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </Layout>
    );
}
