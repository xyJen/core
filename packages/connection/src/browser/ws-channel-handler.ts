import { WSChannel, MessageString } from '../common/ws-channel';
import * as shortid from 'shortid';
import { stringify, parse } from '../common/utils';
import { MultiWs } from './multi-ws';
import { warning } from '@ali/ide-core-common/lib/utils/warning';
import { IReporterService, REPORT_NAME } from '@ali/ide-core-common';

let ReconnectingWebSocket = require('reconnecting-websocket');

if (ReconnectingWebSocket.default) {
  /* istanbul ignore next */
  ReconnectingWebSocket = ReconnectingWebSocket.default;
}

// import ReconnectingWebSocket from 'reconnecting-websocket';
// import { IStatusBarService } from '@ali/ide-core-browser/lib/services';

// 前台链接管理类
export class WSChannelHandler {
  public connection: WebSocket;
  private channelMap: Map<number | string, WSChannel> = new Map();
  // FIXME: 这里的默认值和类型需要修复一下 @上坡
  private logger = console;
  public clientId: string;
  private heartbeatMessageTimer: NodeJS.Timeout;
  private reporterService: IReporterService;

  constructor(public wsPath: string, logger: any, public protocols?: string[], useExperimentalMultiChannel?: boolean, clientId?: string) {
    this.logger = logger || this.logger;
    this.clientId = clientId || `CLIENT_ID_${shortid.generate()}`;
    this.connection = useExperimentalMultiChannel ? new MultiWs(wsPath, protocols, this.clientId) as any : new ReconnectingWebSocket(wsPath, protocols, {}); // new WebSocket(wsPath, protocols);
  }
  // 为解决建立连接之后，替换成可落盘的 logger
  replaceLogger(logger: any) {
    if (logger) {
      this.logger = logger;
    }
  }
  setReporter(reporterService: IReporterService) {
    this.reporterService = reporterService;
  }
  private clientMessage() {
    const clientMsg: MessageString = stringify({
      kind: 'client',
      clientId: this.clientId,
    });
    this.connection.send(clientMsg);
  }
  private heartbeatMessage() {
    if (this.heartbeatMessageTimer) {
      clearTimeout(this.heartbeatMessageTimer);
    }
    this.heartbeatMessageTimer = setTimeout(() => {
      const msg = stringify({
        kind: 'heartbeat',
        clientId: this.clientId,
      });
      this.connection.send(msg);
      this.heartbeatMessage();
    }, 5000);
  }

  public async initHandler() {
    this.connection.onmessage = (e) => {
      // 一个心跳周期内如果有收到消息，则不需要再发送心跳
      this.heartbeatMessage();

      const msg = parse(e.data);

      if (msg.id) {
        const channel = this.channelMap.get(msg.id);
        if (channel) {
          channel.handleMessage(msg);
        } else {
          this.logger.warn(`channel ${msg.id} not found`);
        }
      }
    };
    await new Promise((resolve) => {
      this.connection.addEventListener('open', () => {
        this.clientMessage();
        this.heartbeatMessage();
        resolve();

        // 重连 channel

        if (this.channelMap.size) {
          this.channelMap.forEach((channel) => {
            channel.onOpen(() => {
              this.reporterService && this.reporterService.point(REPORT_NAME.CHANNEL_RECONNECT);
              this.logger && this.logger.log(`channel reconnect ${this.clientId}:${channel.channelPath}`);
            });
            channel.open(channel.channelPath);

            // 针对前端需要重新设置下后台状态的情况
            if (channel.fireReOpen) {
              channel.fireReOpen();
            }
          });
        }
      });
    });
  }
  private getChannelSend = (connection) => {
    return (content: string) => {
      connection.send(content, (err: Error) => {
        if (err) {
          this.logger.warn(err);
        }
      });
    };
  }
  public async openChannel(channelPath: string) {
    const channelSend = this.getChannelSend(this.connection);
    const channelId = `${this.clientId}:${channelPath}`;
    const channel = new WSChannel(channelSend, channelId);
    this.channelMap.set(channel.id, channel);

    await new Promise((resolve) => {
      channel.onOpen(() => {
        resolve();
      });
      channel.open(channelPath);
    });

    return channel;
  }

  public dispose() {
    if (this.heartbeatMessageTimer) {
      clearTimeout(this.heartbeatMessageTimer);
    }
  }
}

export class WSChanneHandler extends WSChannelHandler {
  constructor(public wsPath: string, logger: any, public protocols?: string[], useExperimentalMultiChannel?: boolean, clientId?: string) {
    super(wsPath, logger, protocols, useExperimentalMultiChannel, clientId);
    warning(false, '[Deprecated warning]: WSChanneHandler was a wrong typo, please use WSChannelHandler');
  }
}
