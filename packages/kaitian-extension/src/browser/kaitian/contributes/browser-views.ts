import { Injectable, Autowired } from '@ali/common-di';
import { VSCodeContributePoint, Contributes } from '../../../common';
import { IMainLayoutService } from '@ali/ide-main-layout';
import { getIcon } from '@ali/ide-core-browser';
import { DisposableCollection, getDebugLogger } from '@ali/ide-core-common';
import { ExtensionLoadingView } from '../../components';
import { IIconService } from '@ali/ide-theme';

export type KtViewLocation = 'left' | 'right' | 'bottom' | 'editor' | 'toolBar';

export type KtViewsContribution = {
  [key in KtViewLocation]: {
    type: string;
    view: KtViewItem[];
  };
};

export interface KtViewItem {
  id: string;
  when: string;
  title: string;
  icon?: string;
  iconPath?: string;
  priority?: number;
  noResize?: boolean;
  hideTab?: boolean;
  expanded?: boolean;
  weight?: number;
  titleComponentId?: string;
}

export type KtViewsSchema = Array<KtViewsContribution>;

const SUPPORT_LOCATION = [ 'left', 'right', 'bottom', 'editor', 'toolBar' ];

@Injectable()
@Contributes('browserViews')
export class KtViewContributionPoint extends VSCodeContributePoint<KtViewsContribution> {

  @Autowired(IMainLayoutService)
  mainlayoutService: IMainLayoutService;

  @Autowired(IIconService)
  iconService: IIconService;

  private disposableCollection: DisposableCollection = new DisposableCollection();

  // 不支持提前加载的视图
  static unsupportLocation = ['bottom', 'editor', 'toolBar'];

  contribute() {
    const keys = Object.keys(this.json).filter((key) => !KtViewContributionPoint.unsupportLocation.includes(key));
    for (let location of keys) {
      const views = this.json[location].view.map((view) => {
        return {
          ...view,
          component: ExtensionLoadingView,
        };
      });
      if (!SUPPORT_LOCATION.includes(location)) {
        if (!this.mainlayoutService.getTabbarHandler(location)) {
          // 若目标视图不存在，append将fallback到add模式添加到左侧边栏
          location = 'left';
        } else {
          // 走append view逻辑
          for (const view of views) {
            if (view.titleComponentId) {
              getDebugLogger().warn(`custom title component '${view.titleComponentId}' is not allowed for built-in container ${location}!`);
            }
            const { title, id, priority, component, when, weight } = view;
            const handlerId = this.mainlayoutService.collectViewComponent({
              id,
              priority,
              component,
              name: title,
              when,
              weight,
            }, location, {}, {
              fromExtension: true,
            });
            this.disposableCollection.push({
              dispose: () => {
                const handler = this.mainlayoutService.getTabbarHandler(handlerId)!;
                handler.disposeView(id);
              },
            });
          }
          return;
        }
      }
      for (const view of views) {
        const { title, icon, iconPath, id, priority, component, expanded, noResize, when, weight, hideTab } = view;
        const containerId = `${this.extension.id}:${id}`;
        const handlerId = this.mainlayoutService.collectTabbarComponent([{
          id,
          priority,
          component,
          when,
          weight,
        }], {
          iconClass: iconPath ? this.iconService.fromIcon(this.extension.path, iconPath) : getIcon(icon!),
          title: title && this.getLocalizeFromNlsJSON(title),
          priority,
          expanded,
          containerId,
          noResize,
          fromExtension: true,
          hideTab,
        }, location);
        this.disposableCollection.push({
          dispose: () => {
            const handler = this.mainlayoutService.getTabbarHandler(handlerId)!;
            handler.dispose();
          },
        });
      }
    }
  }
}
