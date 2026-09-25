import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "../ui/States";

interface Props {
  children: ReactNode;
  /** Changing it (the route) clears the error, so navigating away recovers. */
  resetKey: string;
}

/** Keeps a failing page from blanking the shell: the sidebar and header stay usable. */
export class PageErrorBoundary extends Component<Props, { error: Error | null; key: string }> {
  state = { error: null as Error | null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: { error: Error | null; key: string }) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Page failed to render", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          title="This page couldn't be shown"
          message="Something went wrong while displaying it. Reload the page; if it keeps happening, report it to your administrator."
          onRetry={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}
