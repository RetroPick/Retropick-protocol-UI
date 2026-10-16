import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react';
import { usePathname, useSearchParams, navigate } from '@/lib/next-compat';
import Link from '@/components/product/safe-link';
import { Skeleton } from '@/components/ui/skeleton';
import { DATA_MODE } from '@/lib/live/env';
import { captureReferral } from '@/lib/live/referral-client';
const LaunchpadDiscovery=lazy(()=>import('@/features/launchpad/discovery'));
const CreateLaunch=lazy(()=>import('@/features/launchpad/create-launch'));
const TokenDetail=lazy(()=>import('@/features/launchpad/token-detail'));
const EarnPage=lazy(()=>import('@/features/earn/earn'));
const Docs=lazy(()=>import('@/features/docs/docs'));
const Portfolio=lazy(()=>import('@/features/portfolio/portfolio'));
const MarketDetail=lazy(()=>import('@/features/markets/detail'));
const ActivityFeed=lazy(()=>import('@/features/markets/activity'));
const Creator=lazy(()=>import('@/features/creator/creator'));
const Liquidity=lazy(()=>import('@/features/liquidity/liquidity'));
const PrismDiscovery=lazy(()=>import('@/features/prism/prism').then(m=>({default:m.PrismDiscovery})));
const PrismDetail=lazy(()=>import('@/features/prism/prism').then(m=>({default:m.PrismDetail})));
const PrismCreate=lazy(()=>import('@/features/prism/prism').then(m=>({default:m.PrismCreate})));

function RouteLoading() {
  return <div aria-label="Loading RetroPick"><Skeleton className="h-12 w-2/3 mb-6"/><Skeleton className="h-24 w-full mb-6"/><div className="two-col"><Skeleton className="h-72 w-full"/><Skeleton className="h-72 w-full"/></div></div>;
}

/** Full-page redirect, mirroring apps/web's server-side redirect() pages. */
function RedirectTo({ to }: { to: string }) {
  useEffect(() => { navigate(to, true); }, [to]);
  return <RouteLoading/>;
}

function NotFound() {
  return <div className="error-page"><h1>This page is off the board.</h1><p>The requested route does not exist.</p><Link href="/launchpad" className="btn primary">Explore Launchpad</Link></div>;
}

interface ErrorState { error: unknown }
/** Same contract as apps/web's app/error.tsx (retry resets the boundary). */
class RouteErrorBoundary extends Component<{ children: ReactNode }, ErrorState> {
  state: ErrorState = { error: null };
  static getDerivedStateFromError(error: unknown): ErrorState { return { error }; }
  render() {
    if (this.state.error) return <div className="error-page"><h1>We couldn’t load this view.</h1><p>Your wallet has not been charged. Try loading the page again.</p><button className="btn primary" onClick={() => this.setState({ error: null })}>Try again</button></div>;
    return this.props.children;
  }
}

function legacyMarketsTarget(params: URLSearchParams): string {
  const market = params.get('market');
  const category = params.get('category');
  const type = market === 'prediction' || market === 'crypto' || market === 'stocks' ? market : 'all';
  const query = new URLSearchParams();
  if (type !== 'all') query.set('type', type);
  if (type === 'prediction' && category && ['Crypto', 'Macro', 'Technology', 'Sports'].includes(category)) query.set('predictionTopic', category);
  return `/launchpad${query.size ? `?${query.toString()}` : ''}`;
}

function legacyMarketDetailTarget(marketId: string, params: URLSearchParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of params.entries()) if (typeof value === 'string') query.set(key, value);
  return `/launchpad/prediction/${encodeURIComponent(marketId)}${query.size ? `?${query.toString()}` : ''}`;
}

function legacyCreateTarget(params: URLSearchParams): string {
  const type = params.get('type');
  const launchType = type === 'crypto' || type === 'stocks' || type === 'prediction' ? type : 'prediction';
  return `/launchpad/create?type=${launchType}`;
}

function RouteSwitch() {
  const pathname = usePathname();
  const params = useSearchParams();
  const segs = pathname.split('/').filter(Boolean);
  useEffect(() => { const ref = params.get('ref'); if (DATA_MODE === 'live' && ref) captureReferral(ref); }, [params]);
  if (segs[0] === 'r' && segs.length === 2) return <ReferralRedirect code={segs[1]}/>;
  if (DATA_MODE === 'live' && (['prism','activity','creator','markets'].includes(segs[0]) || segs[1] === 'prediction')) return <div className="panel"><h1>Research module</h1><p>This module has no live financial data.</p><Link href="/launchpad">Open live Launchpad</Link></div>;
  if (segs.length === 0) return <RedirectTo to="/launchpad"/>;
  if (segs.length === 1) {
    switch (segs[0]) {
      case 'launchpad': return <LaunchpadDiscovery/>;
      case 'markets': return <RedirectTo to={legacyMarketsTarget(params)}/>;
      case 'create': return <RedirectTo to={legacyCreateTarget(params)}/>;
      case 'activity': return <ActivityFeed/>;
      case 'earn': return <EarnPage/>;
      case 'liquidity': return <Liquidity/>;
      case 'portfolio': return DATA_MODE === 'live' ? <RedirectTo to="/earn"/> : <Portfolio/>;
      case 'prism': return <PrismDiscovery/>;
      case 'docs': return <Docs/>;
    }
  }
  if (segs[0] === 'launchpad' && segs.length === 2 && segs[1] === 'create') return <CreateLaunch initialType={params.get('type') ?? undefined}/>;
  if (segs[0] === 'launchpad' && segs.length === 3 && segs[1] === 'prediction') return <MarketDetail id={segs[2]}/>;
  if (segs[0] === 'launchpad' && segs.length === 3 && segs[1] === 'token') return <TokenDetail id={segs[2]}/>;
  if (segs[0] === 'liquidity' && segs.length === 3 && segs[1] === 'pools') return <Liquidity token={segs[2]}/>;
  if (segs[0] === 'liquidity' && segs.length === 2 && segs[1] === 'market-making') return <Liquidity maker/>;
  if (segs[0] === 'markets' && segs.length === 2) return <RedirectTo to={legacyMarketDetailTarget(segs[1], params)}/>;
  if (segs[0] === 'prism' && segs.length === 2) {
    if (segs[1] === 'create') return <PrismCreate/>;
    return <PrismDetail id={segs[1]}/>;
  }
  if (segs[0] === 'creator' && segs.length === 2) return <Creator address={segs[1]}/>;
  return <NotFound/>;
}

function ReferralRedirect({code}:{code:string}) {
  useEffect(()=>{captureReferral(code);navigate('/launchpad',true);},[code]);
  return <RouteLoading/>;
}

export function Routes() {
  const pathname=usePathname();
  return <RouteErrorBoundary key={pathname}><Suspense fallback={<RouteLoading/>}><RouteSwitch/></Suspense></RouteErrorBoundary>;
}
