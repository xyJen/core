import { IRPCProtocol } from '@ali/ide-connection';
import { ExtHostAPIIdentifier, IMainThreadOutput, IExtHostOutput } from '../../../common/vscode';
import { Injectable, Autowired, Optinal } from '@ali/common-di';
import { OutputService } from '@ali/ide-output/lib/browser/output.service';
import { OutputChannel } from '@ali/ide-output/lib/browser/output.channel';
import { IMainLayoutService } from '@ali/ide-main-layout';

@Injectable({ multiple: true })
export class MainThreadOutput implements IMainThreadOutput {

  @Autowired(OutputService)
  private outputService: OutputService;

  private channels: Map<string, OutputChannel> = new Map();

  private readonly proxy: IExtHostOutput;

  @Autowired(IMainLayoutService)
  layoutService: IMainLayoutService;

  constructor(@Optinal(Symbol()) private rpcProtocol: IRPCProtocol) {
    this.proxy = this.rpcProtocol.getProxy(ExtHostAPIIdentifier.ExtHostOutput);
  }

  public dispose() {
    this.channels.forEach((channel) => {
      this.outputService.deleteChannel(channel.name);
    });
    this.channels.clear();
  }

  $append(channelName: string, value: string): PromiseLike<void> {
    const outputChannel = this.getChannel(channelName);
    if (outputChannel) {
      outputChannel.append(value);
    }

    return Promise.resolve();
  }

  $clear(channelName: string): PromiseLike<void> {
    const outputChannel = this.getChannel(channelName);
    if (outputChannel) {
      outputChannel.clear();
    }

    return Promise.resolve();
  }

  $dispose(channelName: string): PromiseLike<void> {
    this.outputService.deleteChannel(channelName);
    if (this.channels.has(channelName)) {
      this.channels.delete(channelName);
    }

    return Promise.resolve();
  }

  async $reveal(channelName: string, preserveFocus: boolean): Promise<void> {
    const outputChannel = this.getChannel(channelName);
    if (outputChannel) {
      const activate = !preserveFocus;
      const reveal = preserveFocus;
      // this.commonOutputWidget = await this.outputContribution.openView({ activate, reveal });
      outputChannel.setVisibility(true);
      this.outputService.updateSelectedChannel(outputChannel);
    }
  }

  $close(channelName: string): PromiseLike<void> {
    const outputChannel = this.getChannel(channelName);
    if (outputChannel) {
      outputChannel.setVisibility(false);
    }
    const channels = this.outputService.getChannels();
    const isEmpty = channels.findIndex((channel: OutputChannel) => channel.isVisible) === -1;
    /*
    if (isEmpty && this.commonOutputWidget) {
        this.commonOutputWidget.close();
    }
    */

    return Promise.resolve();
  }

  private getChannel(channelName: string): OutputChannel | undefined {
    let outputChannel: OutputChannel | undefined;
    if (this.channels.has(channelName)) {
      outputChannel = this.channels.get(channelName);
    } else {
      outputChannel = this.outputService.getChannel(channelName);
      this.channels.set(channelName, outputChannel);
    }

    return outputChannel;
  }
}
