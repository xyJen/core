import { Event, Disposable, uuid, URI, localize, Deferred } from '@ali/ide-core-common';
import { Optional, Injectable, Autowired } from '@ali/common-di';
import { IMainLayoutService } from '@ali/ide-main-layout';
import { PreferenceService } from '@ali/ide-core-browser';
import { IEditorDocumentModelService, IEditorDocumentModelRef } from '@ali/ide-editor/lib/browser';

import { OutputPreferences } from './output-preference';

const DEFAULT_MAX_CHANNEL_LINE = 50000;

@Injectable({ multiple: true })
export class OutputChannel extends Disposable {
  private outputLines: string[] = [];
  private visible: boolean = true;
  private shouldLogToBrowser = false;

  @Autowired(IMainLayoutService)
  private readonly layoutService: IMainLayoutService;

  @Autowired(PreferenceService)
  private readonly preferenceService: PreferenceService;

  @Autowired(OutputPreferences)
  private readonly outputPreferences: OutputPreferences;

  @Autowired(IEditorDocumentModelService)
  protected readonly documentService: IEditorDocumentModelService;

  public outputModel: IEditorDocumentModelRef;

  private monacoModel: monaco.editor.ITextModel;

  public modelReady: Deferred<boolean> = new Deferred();

  private maxChannelLine: number = DEFAULT_MAX_CHANNEL_LINE;

  private enableHighlight: boolean = true;

  constructor(@Optional() public readonly name: string) {
    super();

    const preferenceMaxLine = this.preferenceService.get<number>('output.maxChannelLine');
    if (preferenceMaxLine) {
      this.maxChannelLine = preferenceMaxLine;
    }

    this.enableHighlight = Boolean(this.preferenceService.get<boolean>('output.enableLogHighlight'));

    this.setShouldLogToBrowser();

    this.addDispose(this.preferenceService.onPreferenceChanged((e) => {
      switch (e.preferenceName) {
        case 'output.maxChannelLine':
          this.onDidMaxChannelLineChange(e);
          break;
        case 'output.logWhenNoPanel':
          this.setShouldLogToBrowser();
          break;
        case 'output.enableLogHighlight':
          this.onDidLogHighlightChange(e);
          break;
        default:
          break;
      }
    }));

    const uri = new URI(`walkThroughSnippet://output/${name || uuid()}`);
    this.documentService.createModelReference(uri)
      .then((model) => {
        this.outputModel = model;
        this.monacoModel = this.outputModel.instance.getMonacoModel();
        this.monacoModel.setValue(localize('output.channel.none', '还没有任何输出'));

        if (this.enableHighlight) {
          this.outputModel.instance.languageId = 'log';
        }
        this.modelReady.resolve();
      });
  }

  private onDidMaxChannelLineChange(event) {
    if (event.newValue !== this.maxChannelLine) {
      this.maxChannelLine = event.newValue;
    }
  }

  private onDidLogHighlightChange(event) {
    this.modelReady.promise.then(() => {
      if (event.newValue !== this.enableHighlight) {
        this.enableHighlight = event.newValue;
      }
      if (event.newValue) {
        this.outputModel.instance.languageId = 'log';
      } else {
        this.outputModel.instance.languageId = 'plaintext';
      }
    });
  }

  private setShouldLogToBrowser() {
    const noVisiblePanel = !this.layoutService.getTabbarHandler('ide-output');
    const logWhenNoPanel = this.outputPreferences['output.logWhenNoPanel'];
    this.shouldLogToBrowser = Boolean(noVisiblePanel && logWhenNoPanel);
  }

  private doReplace(value: string) {
    this.monacoModel.setValue(value);
  }

  private pushEditOperations(value: string): void {
    const lineCount = this.monacoModel.getLineCount();
    const character = value.length;
    // 用 pushEditOperations 插入文本，直接替换 content 会触发重新计算高亮
    this.monacoModel.pushEditOperations([], [{
      range: new monaco.Range(lineCount, 0, lineCount + 1, character),
      text: value,
      forceMoveMarkers: true,
    }], () => []);
  }

  private isEmptyChannel(): boolean {
    return this.outputLines.length === 0;
  }

  private doAppend(value: string): void {
    let needSlice = false;
    if (this.outputLines.length + 1 >= this.maxChannelLine) {
      needSlice = true;
      this.outputLines = this.outputLines.slice(this.maxChannelLine / 2);
    }
    // 由于 model 创建是异步的， 这里要等 modelReady 才能写入
    this.modelReady.promise.then(() => {
      if (this.isEmptyChannel() || needSlice) {
        this.doReplace(this.outputLines.join('') + value);
      } else {
        this.pushEditOperations(value);
      }
      this.outputLines.push(value);
    });
  }

  append(value: string): void {
    this.doAppend(value);
  }

  appendLine(line: string): void {
    let value = line;
    if (!value.endsWith('\n')) {
      value += '\n';
    }
    this.doAppend(value);
    if (this.shouldLogToBrowser) {
      console.log(`%c[${this.name}]` + `%c ${line}}`, 'background:rgb(50, 150, 250); color: #fff', 'background: none; color: inherit');
    }
  }

  clear(): void {
    this.outputLines = [];
    this.monacoModel.setValue(localize('output.channel.none', '还没有任何输出'));
  }

  setVisibility(visible: boolean): void {
    this.visible = visible;

    if (visible) {
      const handler = this.layoutService.getTabbarHandler('ide-output');
      if (!handler) {
        return;
      }
      if (!handler.isVisible) {
        handler.activate();
      }
    }
  }

  get isVisible(): boolean {
    return this.visible;
  }
}
