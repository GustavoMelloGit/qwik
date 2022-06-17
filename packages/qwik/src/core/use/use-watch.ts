import { getProxyTarget, noSerialize, NoSerialize } from '../object/q-object';
import type { QRL } from '../import/qrl.public';
import { getContext } from '../props/props';
import { newInvokeContext, useRenderContext, useWaitOn } from './use-core';
import { useHostElement } from './use-host-element.public';
import { logDebug, logError } from '../util/log';
import { then } from '../util/promises';
import { useSequentialScope } from './use-store.public';
import { QRLInternal } from '../import/qrl-class';
import { getDocument } from '../util/dom';
import { isFunction, isObject, ValueOrPromise } from '../util/types';
import { getPlatform } from '../platform/platform';
import { useDocument } from './use-document.public';
import { ContainerState, handleWatch } from '../render/notify-render';
import { useResumeQrl, useVisibleQrl } from './use-on';
import { implicit$FirstArg } from '../util/implicit_dollar';
import { assertDefined } from '../assert/assert';

export const WatchFlagsIsEffect = 1 << 0;
export const WatchFlagsIsWatch = 1 << 1;
export const WatchFlagsIsDirty = 1 << 2;
export const WatchFlagsIsCleanup = 1 << 3;

/**
 * @alpha
 */
export type WatchFn = (track: Tracker) => ValueOrPromise<void | (() => void)>;

/**
 * @alpha
 */
export type ServerFn = () => ValueOrPromise<void | (() => void)>;

/**
 * @alpha
 */
export interface WatchDescriptor {
  qrl: QRL<WatchFn>;
  el: Element;
  f: number;
  i: number;
  destroy?: NoSerialize<() => void>;
  running?: NoSerialize<Promise<WatchDescriptor>>;
}

export const isWatchDescriptor = (obj: any): obj is WatchDescriptor => {
  return isObject(obj) && 'qrl' in obj && 'f' in obj;
};

export const isWatchCleanup = (obj: any): obj is WatchDescriptor => {
  return isWatchDescriptor(obj) && !!(obj.f & WatchFlagsIsCleanup);
};

/**
 * @alpha
 */
export type UseEffectRunOptions = 'visible' | 'load';

/**
 * @alpha
 */
export interface UseEffectOptions {
  run?: UseEffectRunOptions;
}

// <docs markdown="../readme.md#useWatch">
// !!DO NOT EDIT THIS COMMENT DIRECTLY!!!
// (edit ../readme.md#useWatch instead)
/**
 * Reruns the `watchFn` when the observed inputs change.
 *
 * Use `useWatch` to observe changes on a set of inputs, and then re-execute the `watchFn` when
 * those inputs change.
 *
 * The `watchFn` only executes if the observed inputs change. To observe the inputs use the `obs`
 * function to wrap property reads. This creates subscriptions which will trigger the `watchFn`
 * to re-run.
 *
 * @see `Tracker`
 *
 * @public
 *
 * ## Example
 *
 * The `useWatch` function is used to observe the `state.count` property. Any changes to the
 * `state.count` cause the `watchFn` to execute which in turn updates the `state.doubleCount` to
 * the double of `state.count`.
 *
 * ```tsx
 * const Cmp = component$(() => {
 *   const store = useStore({
 *     count: 0,
 *     doubleCount: 0,
 *     debounced: 0,
 *   });
 *
 *   // Double count watch
 *   useWatch$((track) => {
 *     const count = track(store, 'count');
 *     store.doubleCount = 2 * count;
 *   });
 *
 *   // Debouncer watch
 *   useWatch$((track) => {
 *     const doubleCount = track(store, 'doubleCount');
 *     const timer = setTimeout(() => {
 *       store.debounced = doubleCount;
 *     }, 2000);
 *     return () => {
 *       clearTimeout(timer);
 *     };
 *   });
 *   return (
 *     <Host>
 *       <div>
 *         {store.count} / {store.doubleCount}
 *       </div>
 *       <div>{store.debounced}</div>
 *     </Host>
 *   );
 * });
 * ```
 *
 * @param watch - Function which should be re-executed when changes to the inputs are detected
 * @public
 */
// </docs>
export const useWatchQrl = (qrl: QRL<WatchFn>, opts?: UseEffectOptions): void => {
  const [watch, setWatch, i] = useSequentialScope();
  if (!watch) {
    const el = useHostElement();
    const containerState = useRenderContext().$containerState$;
    const watch: WatchDescriptor = {
      qrl,
      el,
      f: WatchFlagsIsDirty | WatchFlagsIsWatch,
      i,
    };
    setWatch(true);
    getContext(el).$watches$.push(watch);
    useWaitOn(Promise.resolve().then(() => runWatch(watch, containerState)));
    const isServer = containerState.$platform$.isServer;
    if (isServer) {
      useRunWatch(watch, opts?.run);
    }
  }
};

// <docs markdown="../readme.md#useWatch">
// !!DO NOT EDIT THIS COMMENT DIRECTLY!!!
// (edit ../readme.md#useWatch instead)
/**
 * Reruns the `watchFn` when the observed inputs change.
 *
 * Use `useWatch` to observe changes on a set of inputs, and then re-execute the `watchFn` when
 * those inputs change.
 *
 * The `watchFn` only executes if the observed inputs change. To observe the inputs use the `obs`
 * function to wrap property reads. This creates subscriptions which will trigger the `watchFn`
 * to re-run.
 *
 * @see `Tracker`
 *
 * @public
 *
 * ## Example
 *
 * The `useWatch` function is used to observe the `state.count` property. Any changes to the
 * `state.count` cause the `watchFn` to execute which in turn updates the `state.doubleCount` to
 * the double of `state.count`.
 *
 * ```tsx
 * const Cmp = component$(() => {
 *   const store = useStore({
 *     count: 0,
 *     doubleCount: 0,
 *     debounced: 0,
 *   });
 *
 *   // Double count watch
 *   useWatch$((track) => {
 *     const count = track(store, 'count');
 *     store.doubleCount = 2 * count;
 *   });
 *
 *   // Debouncer watch
 *   useWatch$((track) => {
 *     const doubleCount = track(store, 'doubleCount');
 *     const timer = setTimeout(() => {
 *       store.debounced = doubleCount;
 *     }, 2000);
 *     return () => {
 *       clearTimeout(timer);
 *     };
 *   });
 *   return (
 *     <Host>
 *       <div>
 *         {store.count} / {store.doubleCount}
 *       </div>
 *       <div>{store.debounced}</div>
 *     </Host>
 *   );
 * });
 * ```
 *
 * @param watch - Function which should be re-executed when changes to the inputs are detected
 * @public
 */
// </docs>
export const useWatch$ = /*#__PURE__*/ implicit$FirstArg(useWatchQrl);

// <docs markdown="../readme.md#useClientEffect">
// !!DO NOT EDIT THIS COMMENT DIRECTLY!!!
// (edit ../readme.md#useClientEffect instead)
/**
 * ```tsx
 * const Timer = component$(() => {
 *   const store = useStore({
 *     count: 0,
 *   });
 *
 *   useClientEffect$(() => {
 *     // Only runs in the client
 *     const timer = setInterval(() => {
 *       store.count++;
 *     }, 500);
 *     return () => {
 *       clearInterval(timer);
 *     };
 *   });
 *
 *   return <Host>{store.count}</Host>;
 * });
 * ```
 *
 * @public
 */
// </docs>
export const useClientEffectQrl = (qrl: QRL<WatchFn>, opts?: UseEffectOptions): void => {
  const [watch, setWatch, i] = useSequentialScope();
  if (!watch) {
    const el = useHostElement();
    const watch: WatchDescriptor = {
      qrl,
      el,
      f: WatchFlagsIsEffect,
      i,
    };
    setWatch(true);
    getContext(el).$watches$.push(watch);
    useRunWatch(watch, opts?.run ?? 'visible');
    const doc = useDocument() as any;
    if (doc['qO']) {
      doc['qO'].observe(el);
    }
  }
};

// <docs markdown="../readme.md#useClientEffect">
// !!DO NOT EDIT THIS COMMENT DIRECTLY!!!
// (edit ../readme.md#useClientEffect instead)
/**
 * ```tsx
 * const Timer = component$(() => {
 *   const store = useStore({
 *     count: 0,
 *   });
 *
 *   useClientEffect$(() => {
 *     // Only runs in the client
 *     const timer = setInterval(() => {
 *       store.count++;
 *     }, 500);
 *     return () => {
 *       clearInterval(timer);
 *     };
 *   });
 *
 *   return <Host>{store.count}</Host>;
 * });
 * ```
 *
 * @public
 */
// </docs>
export const useClientEffect$ = /*#__PURE__*/ implicit$FirstArg(useClientEffectQrl);

// <docs markdown="../readme.md#useServerMount">
// !!DO NOT EDIT THIS COMMENT DIRECTLY!!!
// (edit ../readme.md#useServerMount instead)
/**
 * Register's a server mount hook, that runs only in server when the component is first mounted.
 *
 * ## Example
 *
 * ```tsx
 * const Cmp = component$(() => {
 *   const store = useStore({
 *     users: [],
 *   });
 *
 *   useServerMount$(async () => {
 *     // This code will ONLY run once in the server, when the component is mounted
 *     store.users = await db.requestUsers();
 *   });
 *
 *   return (
 *     <Host>
 *       {store.users.map((user) => (
 *         <User user={user} />
 *       ))}
 *     </Host>
 *   );
 * });
 *
 * interface User {
 *   name: string;
 * }
 * function User(props: { user: User }) {
 *   return <div>Name: {props.user.name}</div>;
 * }
 * ```
 *
 * @see `useClientMount` `useMount`
 * @public
 */
// </docs>
export const useServerMountQrl = (mountQrl: QRL<ServerFn>): void => {
  const [watch, setWatch] = useSequentialScope();
  if (!watch) {
    setWatch(true);
    const isServer = getPlatform(useDocument()).isServer;
    if (isServer) {
      useWaitOn(mountQrl.invoke());
    }
  }
};

// <docs markdown="../readme.md#useServerMount">
// !!DO NOT EDIT THIS COMMENT DIRECTLY!!!
// (edit ../readme.md#useServerMount instead)
/**
 * Register's a server mount hook, that runs only in server when the component is first mounted.
 *
 * ## Example
 *
 * ```tsx
 * const Cmp = component$(() => {
 *   const store = useStore({
 *     users: [],
 *   });
 *
 *   useServerMount$(async () => {
 *     // This code will ONLY run once in the server, when the component is mounted
 *     store.users = await db.requestUsers();
 *   });
 *
 *   return (
 *     <Host>
 *       {store.users.map((user) => (
 *         <User user={user} />
 *       ))}
 *     </Host>
 *   );
 * });
 *
 * interface User {
 *   name: string;
 * }
 * function User(props: { user: User }) {
 *   return <div>Name: {props.user.name}</div>;
 * }
 * ```
 *
 * @see `useClientMount` `useMount`
 * @public
 */
// </docs>
export const useServerMount$ = /*#__PURE__*/ implicit$FirstArg(useServerMountQrl);

// <docs markdown="../readme.md#useClientMount">
// !!DO NOT EDIT THIS COMMENT DIRECTLY!!!
// (edit ../readme.md#useClientMount instead)
/**
 * Register's a client mount hook, that runs only in client when the component is first mounted.
 *
 * ## Example
 *
 * ```tsx
 * const Cmp = component$(() => {
 *   const store = useStore({
 *     hash: ''
 *   });
 *
 *   useClientMount$(async () => {
 *     // This code will ONLY run once in the client, when the component is mounted
 *     store.hash = document.location.hash
 *   });
 *
 *   return (
 *     <Host>
 *       <p>The url hash is: ${store.hash}</p>
 *     </Host>
 *   );
 * });
 * ```
 *
 * @see `useServerMount` `useMount`
 *
 * @public
 */
// </docs>
export const useClientMountQrl = (mountQrl: QRL<ServerFn>): void => {
  const [watch, setWatch] = useSequentialScope();
  if (!watch) {
    setWatch(true);
    const isServer = getPlatform(useDocument()).isServer;
    if (!isServer) {
      useWaitOn(mountQrl.invoke());
    }
  }
};

// <docs markdown="../readme.md#useClientMount">
// !!DO NOT EDIT THIS COMMENT DIRECTLY!!!
// (edit ../readme.md#useClientMount instead)
/**
 * Register's a client mount hook, that runs only in client when the component is first mounted.
 *
 * ## Example
 *
 * ```tsx
 * const Cmp = component$(() => {
 *   const store = useStore({
 *     hash: ''
 *   });
 *
 *   useClientMount$(async () => {
 *     // This code will ONLY run once in the client, when the component is mounted
 *     store.hash = document.location.hash
 *   });
 *
 *   return (
 *     <Host>
 *       <p>The url hash is: ${store.hash}</p>
 *     </Host>
 *   );
 * });
 * ```
 *
 * @see `useServerMount` `useMount`
 *
 * @public
 */
// </docs>
export const useClientMount$ = /*#__PURE__*/ implicit$FirstArg(useClientMountQrl);

// <docs markdown="../readme.md#useMount">
// !!DO NOT EDIT THIS COMMENT DIRECTLY!!!
// (edit ../readme.md#useMount instead)
/**
 * Register's a mount hook, that runs both in the server and the client when the component is
 * first mounted.
 *
 * ## Example
 *
 * ```tsx
 * const Cmp = component$(() => {
 *   const store = useStore({
 *     temp: 0,
 *   });
 *
 *   useMount$(async () => {
 *     // This code will run once whenever a component is mounted in the server, or in the client
 *     const res = await fetch('weather-api.example');
 *     const json = await res.json() as any;
 *     store.temp = json.temp;
 *   });
 *
 *   return (
 *     <Host>
 *       <p>The temperature is: ${store.temp}</p>
 *     </Host>
 *   );
 * });
 * ```
 *
 * @see `useServerMount` `useClientMount`
 * @public
 */
// </docs>
export const useMountQrl = (mountQrl: QRL<ServerFn>): void => {
  const [watch, setWatch] = useSequentialScope();
  if (!watch) {
    setWatch(true);
    useWaitOn(mountQrl.invoke());
  }
};

// <docs markdown="../readme.md#useMount">
// !!DO NOT EDIT THIS COMMENT DIRECTLY!!!
// (edit ../readme.md#useMount instead)
/**
 * Register's a mount hook, that runs both in the server and the client when the component is
 * first mounted.
 *
 * ## Example
 *
 * ```tsx
 * const Cmp = component$(() => {
 *   const store = useStore({
 *     temp: 0,
 *   });
 *
 *   useMount$(async () => {
 *     // This code will run once whenever a component is mounted in the server, or in the client
 *     const res = await fetch('weather-api.example');
 *     const json = await res.json() as any;
 *     store.temp = json.temp;
 *   });
 *
 *   return (
 *     <Host>
 *       <p>The temperature is: ${store.temp}</p>
 *     </Host>
 *   );
 * });
 * ```
 *
 * @see `useServerMount` `useClientMount`
 * @public
 */
// </docs>
export const useMount$ = /*#__PURE__*/ implicit$FirstArg(useMountQrl);

export const runWatch = (
  watch: WatchDescriptor,
  containerState: ContainerState
): Promise<WatchDescriptor> => {
  if (!(watch.f & WatchFlagsIsDirty)) {
    logDebug('Watch is not dirty, skipping run', watch);
    return Promise.resolve(watch);
  }
  watch.f &= ~WatchFlagsIsDirty;
  const promise = new Promise<WatchDescriptor>((resolve) => {
    then(watch.running, () => {
      cleanupWatch(watch);
      const el = watch.el;
      const doc = getDocument(el);
      const invokationContext = newInvokeContext(doc, el, el, 'WatchEvent');
      const { $subsManager$: subsManager } = containerState;
      const watchFn = watch.qrl.invokeFn(el, invokationContext, () => {
        subsManager.$clearSub$(watch);
      });
      const track: Tracker = (obj: any, prop?: string) => {
        const target = getProxyTarget(obj);
        assertDefined(target, 'Expected a Proxy object to track');
        const manager = subsManager.$getLocal$(target);
        manager.$addSub$(watch, prop);
        if (prop) {
          return obj[prop];
        } else {
          return obj;
        }
      };

      return then(watchFn(track), (returnValue) => {
        if (isFunction(returnValue)) {
          watch.destroy = noSerialize(returnValue);
        }
        resolve(watch);
      });
    });
  });
  watch.running = noSerialize(promise);
  return promise;
};

export const cleanupWatch = (watch: WatchDescriptor) => {
  const destroy = watch.destroy;
  if (destroy) {
    watch.destroy = undefined;
    try {
      destroy();
    } catch (err) {
      logError(err);
    }
  }
};

export const destroyWatch = (watch: WatchDescriptor) => {
  if (watch.f & WatchFlagsIsCleanup) {
    watch.f &= ~WatchFlagsIsCleanup;
    const cleanup = watch.qrl.invokeFn(watch.el);
    (cleanup as any)();
  } else {
    cleanupWatch(watch);
  }
};

// <docs markdown="../readme.md#Tracker">
// !!DO NOT EDIT THIS COMMENT DIRECTLY!!!
// (edit ../readme.md#Tracker instead)
/**
 * Used to signal to Qwik which state should be watched for changes.
 *
 * The `Tracker` is passed into the `watchFn` of `useWatch`. It is intended to be used to wrap
 * state objects in a read proxy which signals to Qwik which properties should be watched for
 * changes. A change to any of the properties cause the `watchFn` to re-run.
 *
 * ## Example
 *
 * The `obs` passed into the `watchFn` is used to mark `state.count` as a property of interest.
 * Any changes to the `state.count` property will cause the `watchFn` to re-run.
 *
 * ```tsx
 * const Cmp = component$(() => {
 *   const store = useStore({ count: 0, doubleCount: 0 });
 *   useWatch$((track) => {
 *     const count = track(store, 'count');
 *     store.doubleCount = 2 * count;
 *   });
 *   return (
 *     <div>
 *       <span>
 *         {store.count} / {store.doubleCount}
 *       </span>
 *       <button onClick$={() => store.count++}>+</button>
 *     </div>
 *   );
 * });
 * ```
 *
 * @see `useWatch`
 *
 * @public
 */
// </docs>
export interface Tracker {
  <T extends {}>(obj: T): T;
  <T extends {}, B extends keyof T>(obj: T, prop: B): T[B];
}

const useRunWatch = (watch: WatchDescriptor, run: UseEffectRunOptions | undefined) => {
  if (run === 'load') {
    useResumeQrl(getWatchHandlerQrl(watch));
  } else if (run === 'visible') {
    useVisibleQrl(getWatchHandlerQrl(watch));
  }
};

const getWatchHandlerQrl = (watch: WatchDescriptor) => {
  const watchQrl = watch.qrl as QRLInternal;
  const watchHandler = new QRLInternal(
    (watchQrl as QRLInternal).$chunk$,
    'handleWatch',
    handleWatch,
    null,
    null,
    [watch]
  );
  watchHandler.$refSymbol$ = (watchQrl as QRLInternal).$symbol$;
  return watchHandler;
};