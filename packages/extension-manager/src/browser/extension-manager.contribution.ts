import { ComponentContribution, ComponentRegistry } from '@ali/ide-core-browser/lib/layout';
import { Domain, localize } from '@ali/ide-core-common';
import { enableExtensionsTarbarHandlerId, IExtensionManagerService, EXTENSION_SCHEME, enableExtensionsContainerId, searchExtensionsTarbarHandlerId, disableExtensionsTarbarHandlerId } from '../common';
import { ExtensionEnablePanel } from './extension-panel-enable.view';
import { ExtensionDisablePanel } from './extension-panel-disable.view';
import { ExtensionSearchPanel } from './extension-panel-search.view';
import { ExtensionDetailView } from './extension-detail.view';
import { MainLayoutContribution, IMainLayoutService } from '@ali/ide-main-layout';
import { Autowired } from '@ali/common-di';
import { BrowserEditorContribution, EditorComponentRegistry } from '@ali/ide-editor/lib/browser';
import { ResourceService } from '@ali/ide-editor';
import { ExtensionResourceProvider } from './extension-resource-provider';
import { ExtensionSearchHeader } from './components/extension-search-header';
import { getIcon } from '@ali/ide-core-browser/lib/icon';

@Domain(ComponentContribution, MainLayoutContribution, BrowserEditorContribution)
export class ExtensionManagerContribution implements MainLayoutContribution, ComponentContribution, BrowserEditorContribution {

  @Autowired(IMainLayoutService)
  mainLayoutService: IMainLayoutService;

  @Autowired(IExtensionManagerService)
  etensionManagerService: IExtensionManagerService;

  @Autowired()
  resourceProvider: ExtensionResourceProvider;

  registerResource(resourceService: ResourceService) {
    resourceService.registerResourceProvider(this.resourceProvider);
  }

  registerEditorComponent(editorComponentRegistry: EditorComponentRegistry) {
    const EXTENSIONS_DETAIL_COMPONENT_ID = `${EXTENSION_SCHEME}_detail`;
    editorComponentRegistry.registerEditorComponent({
      component: ExtensionDetailView,
      uid: EXTENSIONS_DETAIL_COMPONENT_ID,
      scheme: EXTENSION_SCHEME,
    });

    editorComponentRegistry.registerEditorComponentResolver(EXTENSION_SCHEME, (_, __, resolve) => {

      resolve!([
        {
          type: 'component',
          componentId: EXTENSIONS_DETAIL_COMPONENT_ID,
        },
      ]);

    });
  }

  registerComponent(registry: ComponentRegistry): void {
    registry.register('@ali/ide-extension-manager', [{
      component: ExtensionEnablePanel,
      id: enableExtensionsTarbarHandlerId,
      name: localize('marketplace.extension.enabled', '已启用'),
      forceHidden: false,
    }, {
      component: ExtensionDisablePanel,
      id: disableExtensionsTarbarHandlerId,
      name: localize('marketplace.extension.disabled', '已禁用'),
      forceHidden: false,
    }, {
      component: ExtensionSearchPanel,
      id: searchExtensionsTarbarHandlerId,
      name: localize('marketplace.extension.search', '搜索'),
      forceHidden: true,
    }], {
      iconClass: getIcon('extension'),
      title: localize('marketplace.extension.container', '扩展'),
      priority: 5,
      containerId: enableExtensionsContainerId,
    });
  }

  onDidUseConfig() {
    const handler = this.mainLayoutService.getTabbarHandler(enableExtensionsContainerId);
    if (handler) {
      // 在激活的时候获取数据
      handler.onActivate(() => {
        this.etensionManagerService.init();
      });
      handler.setTitleComponent(ExtensionSearchHeader, 32);
    }
  }

}
