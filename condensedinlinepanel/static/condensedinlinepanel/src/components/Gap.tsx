import * as React from 'react';
import {DropTarget} from 'react-dnd';

export type onAddFn = (position: number) => void;
export type onDNDFn = (formId: number, position: number) => void;

export interface GapProps {
    position: number,
    onAdd: onAddFn,
    dndKey: string,
    isOver?: boolean
    onDND?: onDNDFn,
    connectDropTarget?: any,
}

export class Gap extends React.Component<GapProps, {}> {
    /*
     * This component fills the gap between cards and is used as a drop target
     * and a place for the "add new" button
    */

    drop(formId: number) {
        if (this.props.onDND) {
            this.props.onDND(formId, this.props.position);
        }
    }

    render() {
        let classes = ['condensed-inline-panel__gap'];

        let gap = null;
        if (this.props.isOver) {
            classes.push('condensed-inline-panel__gap--over');

            gap = <div className={classes.join(' ')}>
                      <div className="condensed-inline-panel__gap-pseudoform" />
                  </div>;
        } else {
            let onAdd = (e: any) => {
                this.props.onAdd(this.props.position);

                e.preventDefault();
                return false;
            };

            gap = <div className={classes.join(' ')}>
                      <a className="condensed-inline-panel__add-button icon icon-plus-inverse" href="#" onClick={onAdd}></a>
                  </div>;
        }

        // Hook into react dnd
        gap = this.props.connectDropTarget(gap);

        return gap;
    }
}

let dropTarget = {
    drop(props: any, monitor: any, component: any) {
        component.drop(monitor.getItem().formId);
    }
};

function dropTargetCollect(connect: any, monitor: any) {
    return {
        connectDropTarget: connect.dropTarget(),
        isOver: monitor.canDrop() && monitor.isOver(),
    };
}

export let DroppableGap: React.ComponentClass<GapProps> = DropTarget((props) => props.dndKey, dropTarget, dropTargetCollect)(Gap);
