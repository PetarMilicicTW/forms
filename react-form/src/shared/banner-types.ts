import type { PBannerProps } from '@porsche-design-system/components-react';

export type BannerMessage = Required<
  Pick<PBannerProps, 'description' | 'heading' | 'open' | 'state'>
>;
