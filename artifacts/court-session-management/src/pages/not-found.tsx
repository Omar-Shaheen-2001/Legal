import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-3 items-center">
            <AlertCircle className="h-8 w-8 text-destructive shrink-0" />
            <h1 className="text-2xl font-bold">
              404 — الصفحة غير موجودة
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
