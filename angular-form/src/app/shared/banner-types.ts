import { PBanner } from '@porsche-design-system/components-angular';

export type BannerMessage = Required<Pick<PBanner, 'description' | 'heading' | 'open' | 'state'>>;
