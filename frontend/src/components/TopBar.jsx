import React from 'react';
import { Database, Menu } from 'lucide-react';
import clsx from 'clsx';
import ProviderSelector from './ProviderSelector';
import ThemeSelector from './ThemeSelector';
import { pluralize } from '../lib/format';

/**
 * Compact application header (56px). It carries the current context on the
 * left and the model control on the right — deliberately short, because the
 * conversation deserves the vertical space.
 */
const TopBar = ({
  isDesktop,
  onOpenMobileNav,
  title,
  contextLabel,
  documentCount = 0,
  onOpenKnowledgeBase,
  providers,
}) => (
  <header className="relative z-chrome flex h-14 shrink-0 items-center gap-2 border-b border-line-subtle bg-surface-1/70 px-2.5 backdrop-blur-xl sm:px-3">
    {!isDesktop && (
      <button type="button" onClick={onOpenMobileNav} className="icon-btn shrink-0" aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </button>
    )}

    <div className="min-w-0 flex-1">
      <h1 className="truncate text-sub font-semibold tracking-tight text-ink">{title}</h1>
      {contextLabel && <p className="eyebrow truncate">{contextLabel}</p>}
    </div>

    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={onOpenKnowledgeBase}
        className={clsx(
          'chip tip tip-below transition-all duration-fast ease-standard hover:-translate-y-px hover:shadow-subtle hover:border-accent/40 hover:text-ink',
          documentCount > 0 && 'text-ink'
        )}
        data-tip={`${pluralize(documentCount, 'document')} indexed`}
        aria-label={`Open knowledge base, ${pluralize(documentCount, 'document')} indexed`}
      >
        <Database className="h-3.5 w-3.5 text-accent" />
        <span className="tabular font-semibold">{documentCount}</span>
      </button>

      <ProviderSelector {...providers} compact={!isDesktop} />
      <ThemeSelector compact={!isDesktop} />
    </div>
  </header>
);

export default TopBar;
