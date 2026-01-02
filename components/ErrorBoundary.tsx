import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, MessageSquare } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * ErrorBoundary component to catch rendering errors and provide a fallback UI.
 */
// Fix: Use React.Component explicitly to ensure inherited properties like state and props are recognized correctly
export class ErrorBoundary extends React.Component<Props, State> {
  // Fix: Initialize state property on the class and remove 'override' as it might cause resolution issues in some environments
  public state: State = {
    hasError: false
  };

  constructor(props: Props) {
    super(props);
  }

  // Fix: Static method for deriving state from error must match return type State
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render(): ReactNode {
    // Fix: 'state' is properly inherited from React.Component
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[200] bg-brand-indigo flex flex-col items-center justify-center p-8 text-center">
          <BrandLogo size="lg" className="mb-8 animate-pulse" />
          
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-sm w-full animate-slide-up">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            
            <h2 className="text-xl font-black text-white uppercase tracking-widest mb-2">Unexpected Error</h2>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              We encountered a glitch in the vibe. Don't worry, you can finish what you were doing by reloading.
            </p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-brand-pink text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-brand-pink/20 active:scale-95 transition-all"
              >
                <RefreshCw size={20} /> FINISH & RELOAD
              </button>
              
              <button 
                // Fix: 'setState' is properly inherited from React.Component
                onClick={() => this.setState({ hasError: false })}
                className="w-full bg-white/5 text-gray-400 font-bold py-3 rounded-xl hover:bg-white/10 transition-colors"
              >
                Try to ignore
              </button>
            </div>
          </div>
          
          <div className="mt-12 flex gap-8 text-gray-500">
            <div className="flex flex-col items-center gap-1">
              <Home size={20} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Support</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <MessageSquare size={20} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Report</span>
            </div>
          </div>
        </div>
      );
    }

    // Fix: 'props' is properly inherited from React.Component
    return this.props.children;
  }
}
