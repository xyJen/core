import { IRPCProtocol } from '@ali/ide-connection';
import { ExtHostAPIIdentifier, IMainThreadCommands, IExtHostCommands } from '../../common';
import { Injectable, Autowired, Optinal } from '@ali/common-di';
import { CommandRegistry, ILogger, CommandService } from '@ali/ide-core-browser';

@Injectable()
export class MainThreadCommands implements IMainThreadCommands {
  private readonly proxy: IExtHostCommands;

  @Autowired(CommandService)
  commandService: CommandService;

  @Autowired(CommandRegistry)
  commandRegistry: CommandRegistry;

  @Autowired(ILogger)
  logger: ILogger;

  constructor(@Optinal(IRPCProtocol) private rpcProtocol: IRPCProtocol) {
    this.proxy = this.rpcProtocol.getProxy(ExtHostAPIIdentifier.ExtHostCommands);
    this.proxy.$registerBuiltInCommands();
  }

  $registerCommand(id: string): void {
    this.logger.log('$registerCommand id', id);
    const proxy = this.proxy;
    this.commandRegistry.registerCommand({
      id: id + ':extHost',
    }, {
        execute: (...args) => {
          return proxy.$executeContributedCommand(id, ...args);
        },
      });
  }

  $unregisterCommand(id: string): void {
    throw new Error('Method not implemented.');
  }

  $getCommands(): Promise<string[]> {
    return Promise.resolve(this.commandRegistry.getCommands().map((command) => command.id));
  }

  $executeCommand<T>(id: string, ...args: any[]): Promise<T | undefined> {
    try {
      return this.commandService.executeCommand(id, ...args);
    } catch (e) {
      return Promise.reject(e);
    }
  }
}
