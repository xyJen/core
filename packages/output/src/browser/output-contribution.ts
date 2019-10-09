import { Injectable, Autowired } from '@ali/common-di';
import { CommandContribution, CommandRegistry, Command } from '@ali/ide-core-common';
import { KeybindingContribution, KeybindingRegistry, Logger, ClientAppContribution } from '@ali/ide-core-browser';
import { Domain } from '@ali/ide-core-common/lib/di-helper';
import { MenuContribution, MenuModelRegistry } from '@ali/ide-core-common/lib/menu';
import { Output, ChannelSelector } from './output.view';
import { ComponentContribution, ComponentRegistry } from '@ali/ide-core-browser/lib/layout';
import { IMainLayoutService, MainLayoutContribution } from '@ali/ide-main-layout';
import { TabBarToolbarContribution, TabBarToolbarRegistry } from '@ali/ide-activity-panel/lib/browser/tab-bar-toolbar';
import { getIcon } from '@ali/ide-core-browser/lib/icon';
import { OutputService } from './output.service';

const OUTPUT_CLEAR: Command = {
  id: 'output.channel.clear',
  iconClass: getIcon('clear'),
};
const OUTPUT_CONTAINER_ID = 'ide-output';
@Domain(CommandContribution, KeybindingContribution, MenuContribution, ComponentContribution, MainLayoutContribution, TabBarToolbarContribution)
export class OutputContribution implements CommandContribution, KeybindingContribution, MenuContribution, ComponentContribution, MainLayoutContribution, TabBarToolbarContribution {

  @Autowired()
  logger: Logger;

  @Autowired(IMainLayoutService)
  private layoutService: IMainLayoutService;

  @Autowired()
  private outputService: OutputService;

  onDidUseConfig() {
    const handler = this.layoutService.getTabbarHandler(OUTPUT_CONTAINER_ID);
    handler.setTitleComponent(ChannelSelector);
  }

  registerToolbarItems(registry: TabBarToolbarRegistry) {
    registry.registerItem({
      id: 'output.clear.action',
      command: OUTPUT_CLEAR.id,
      viewId: OUTPUT_CONTAINER_ID,
    });
  }

  registerCommands(commands: CommandRegistry): void {
    commands.registerCommand(OUTPUT_CLEAR, {
      execute: () => this.outputService.selectedChannel.clear(),
      // FIXME 默认为output面板时，无法直接刷新按钮可用状态，需要给出事件 @CC
      isEnabled: () => !!this.outputService.selectedChannel,
    });
  }

  registerMenus(menus: MenuModelRegistry): void {

  }

  registerKeybindings(keybindings: KeybindingRegistry): void {
  }

  registerComponent(registry: ComponentRegistry) {
    registry.register('@ali/ide-output', {
      id: OUTPUT_CONTAINER_ID,
      component: Output,
    }, {
      title: '输出',
      priority: 9,
      containerId: OUTPUT_CONTAINER_ID,
      activateKeyBinding: 'ctrlcmd+shift+u',
    });
  }
}
