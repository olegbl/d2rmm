import {
  Activators,
  SensorInstance,
  SensorOptions,
  SensorProps,
} from '@dnd-kit/core';
import {
  getEventCoordinates,
  getOwnerDocument,
  getWindow,
} from '@dnd-kit/utilities';

// some custom hacks to add click-to-drag and click-to-swap support
// to dnd-kit which only supports hold-to-drag out of the box
// base logic is copy pasta from:
// https://github.com/clauderic/dnd-kit/blob/master/packages/core/src/sensors/pointer/AbstractPointerSensor.ts

class Listeners {
  private listeners: [
    string,
    EventListenerOrEventListenerObject,
    AddEventListenerOptions | boolean | undefined,
  ][] = [];

  constructor(private target: EventTarget | null) {}

  public add<T extends Event>(
    eventName: string,
    handler: (event: T) => void,
    options?: AddEventListenerOptions | boolean,
  ) {
    this.target?.addEventListener(eventName, handler as EventListener, options);
    this.listeners.push([eventName, handler as EventListener, options]);
  }

  public removeAll = () => {
    this.listeners.forEach((listener) =>
      this.target?.removeEventListener(...listener),
    );
  };
}

interface ClickSensorOptions extends SensorOptions {
  onAttemptDragEnd: () => boolean;
}

export class ClickSensor implements SensorInstance {
  public autoScrollEnabled = true;
  private document: Document;
  private initialCoordinates: { x: number; y: number };
  private timeoutId: NodeJS.Timeout | null = null;
  private listeners: Listeners;
  private documentListeners: Listeners;
  private windowListeners: Listeners;

  static activators: Activators<ClickSensorOptions> = [
    {
      eventName: 'onClick' as const,
      handler: ({ nativeEvent: event }, _options, _context) => {
        // ignore right clicks
        if (event.button === 2) {
          return false;
        }

        return true;
      },
    },
  ];

  constructor(private props: SensorProps<ClickSensorOptions>) {
    this.props = props;
    this.document = getOwnerDocument(props.event.target);
    this.documentListeners = new Listeners(this.document);
    this.listeners = new Listeners(getOwnerDocument(props.event.target));
    this.windowListeners = new Listeners(getWindow(props.event.target));
    this.initialCoordinates = getEventCoordinates(props.event) ?? {
      x: 0,
      y: 0,
    };

    this.handleStart = this.handleStart.bind(this);
    this.handleMove = this.handleMove.bind(this);
    this.handleEnd = this.handleEnd.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.removeTextSelection = this.removeTextSelection.bind(this);

    this.attach();
  }

  private attach() {
    this.listeners.add('mousemove', this.handleMove, { passive: false });
    this.listeners.add('click', this.handleEnd);

    this.windowListeners.add('dragstart', this.handleDragStart);
    this.windowListeners.add('contextmenu', this.handleContextMenu);
    this.windowListeners.add('resize', this.handleCancel);
    this.windowListeners.add('visibilitychange', this.handleCancel);

    this.documentListeners.add('keydown', this.handleKeydown);

    this.handleStart();
  }

  private detach() {
    this.listeners.removeAll();
    this.windowListeners.removeAll();

    // Wait until the next event loop before removing document listeners
    // This is necessary because we listen for `click` and `selection` events on the document
    setTimeout(this.documentListeners.removeAll, 50);

    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private handleDragStart(event: Event) {
    event.preventDefault();
  }

  private handleContextMenu(event: Event) {
    event.preventDefault();
  }

  private handleStart() {
    if (this.initialCoordinates != null) {
      // Stop propagation of click events once activation constraints are met
      // this.documentListeners.add('click', stopPropagation, {
      //   capture: true,
      // });

      // Remove any text selection from the document
      this.removeTextSelection();

      // Prevent further text selection while dragging
      this.documentListeners.add('selectionchange', this.removeTextSelection);

      this.props.onStart(this.initialCoordinates);
    }
  }

  private handleMove(event: Event) {
    if (this.initialCoordinates == null) {
      return;
    }

    const coordinates = getEventCoordinates(event) ?? { x: 0, y: 0 };

    if (event.cancelable) {
      event.preventDefault();
    }

    this.props.onMove(coordinates);
  }

  private handleEnd(event: Event) {
    // ignore start event
    if (event === this.props.event) {
      return;
    }

    if (!this.props.options.onAttemptDragEnd()) {
      return;
    }

    this.detach();
    this.props.onEnd();
  }

  private handleCancel() {
    // this.detach();
    // this.props.onCancel();
  }

  private handleKeydown(event: KeyboardEvent) {
    if (event.code === 'Escape') {
      this.handleCancel();
    }
  }

  private removeTextSelection() {
    this.document.getSelection()?.removeAllRanges();
  }
}
