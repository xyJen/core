import * as React from 'react';
import { useInjectable, localize } from '@ali/ide-core-browser';
import { observer } from 'mobx-react-lite';
import * as styles from './debug-hover.module.less';
import * as cls from 'classnames';
import { DebugHoverTreeModelService } from './debug-hover-tree.model.service';
import { IRecycleTreeHandle, RecycleTree, INodeRendererWrapProps } from '@ali/ide-components';
import { DebugHoverModel } from './debug-hover-model';
import { ExpressionNode, ExpressionContainer, DebugHoverVariableRoot } from '../tree/debug-tree-node.define';
import { DebugVariableRenderedNode, DEBUG_VARIABLE_TREE_NODE_HEIGHT } from '../view/variables/debug-variables.view';

export const DebugHoverView = observer(() => {
  const debugHoverTreeModelService: DebugHoverTreeModelService = useInjectable(DebugHoverTreeModelService);

  const [model, setModel] = React.useState<DebugHoverModel>();
  const wrapperRef: React.RefObject<HTMLDivElement> = React.createRef();

  React.useEffect(() => {
    debugHoverTreeModelService.onDidUpdateTreeModel(async (model: DebugHoverModel) => {
      if (model) {
        await model!.root.ensureLoaded();
      }
      setModel(model);
    });

    debugHoverTreeModelService.treeModel!.root.ensureLoaded()
      .then(() => {
        setModel(debugHoverTreeModelService.treeModel);
      });
    return () => {
      debugHoverTreeModelService.removeNodeDecoration();
    };
  }, []);

  const handleTreeReady = (handle: IRecycleTreeHandle) => {
    debugHoverTreeModelService.handleTreeHandler({
      ...handle,
      getModel: () => model!,
      hasDirectFocus: () => wrapperRef.current === document.activeElement,
    });
  };

  const handleTwistierClick = (ev: React.MouseEvent, item: ExpressionNode | ExpressionContainer) => {
    // 阻止点击事件冒泡
    ev.stopPropagation();

    const { handleTwistierClick } = debugHoverTreeModelService;
    if (!item) {
      return;
    }
    handleTwistierClick(item);
  };

  const shouldRenderVariableTree = !!model && !!(model.root as DebugHoverVariableRoot).variablesReference;

  const renderVariableTree = () => {
    if (!shouldRenderVariableTree) {
      return null;
    }
    return <div
      className={ styles.debug_hover_content }
      tabIndex={-1}
      ref={wrapperRef}
    >
      <RecycleTree
        height={250}
        width={300}
        itemHeight={DEBUG_VARIABLE_TREE_NODE_HEIGHT}
        onReady={handleTreeReady}
        model={model!}
        placeholder={() => {
          return <span></span>;
        }}
      >
        {(props: INodeRendererWrapProps) => {
          const decorations = debugHoverTreeModelService.decorations.getDecorations(props.item as any);
          return <DebugVariableRenderedNode
            item={props.item}
            itemType={props.itemType}
            decorations={decorations}
            onClick={handleTwistierClick}
            onTwistierClick={handleTwistierClick}
            defaultLeftPadding={0}
            leftPadding={4}
          />;
        }}
      </RecycleTree>
    </div>;
  };

  return (
    <div className={ styles.debug_hover }>
      {
        model ?
        <div className={ cls(styles.debug_hover_title, shouldRenderVariableTree && styles.has_complex_value) }>
          { model.root.name }
        </div>
        :
        <div className={ styles.debug_hover_title }>
          {localize('debug.hover.not.available')}
        </div>
      }
      {
        renderVariableTree()
      }
    </div>
  );
});
