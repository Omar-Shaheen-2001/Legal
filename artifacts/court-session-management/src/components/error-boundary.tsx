import React from 'react';
import { Button } from '@/components/ui/button';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen space-y-4 text-center p-4">
          <h1 className="text-2xl font-bold text-red-600">عذراً، حدث خطأ غير متوقع.</h1>
          <p className="text-muted-foreground">{this.state.error?.message}</p>
          <Button onClick={() => window.location.reload()}>تحديث الصفحة</Button>
        </div>
      );
    }

    return this.props.children;
  }
}
