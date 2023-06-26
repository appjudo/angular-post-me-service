// Copyright (c) 2023 AppJudo Inc.  MIT License.

import { Injectable, OnDestroy } from '@angular/core';
import { Connection, ParentHandshake, MethodsType, RemoteHandle, WindowMessenger, ChildHandshake } from 'post-me';

type HandshakeFunction = typeof ParentHandshake | typeof ChildHandshake;

interface QueuedRequest {
  methodName: string;
  args: any[];
  resolve: (value: unknown) => void;
  reject: (reason: any) => void;
}

@Injectable({
  providedIn: 'root'
})
export default class PostMeService implements OnDestroy {
  private connection?: Connection;
  private remoteHandle?: RemoteHandle;
  private queuedRequests: QueuedRequest[];
  private methods: MethodsType;
  
  constructor() {
    this.methods = {};
    this.queuedRequests = [];
  }

  registerMethod(methodName: string, method: MethodsType[string]) {
    this.methods[methodName] = method;
  }

  unregisterMethod(methodName: string) {
    delete this.methods[methodName];
  }

  connectToChildWindow(remoteWindow: Window, remoteOrigin: string, ...args: any) {
    const handshake = (messenger: WindowMessenger, methods?: MethodsType) => (
      ParentHandshake(messenger, methods, ...args)
    );
    return this.connectToWindow(remoteWindow, remoteOrigin, handshake);
  }

  connectToParentWindow(remoteWindow: Window, remoteOrigin: string) {
    return this.connectToWindow(remoteWindow, remoteOrigin, ChildHandshake);
  }

  private connectToWindow(remoteWindow: Window, remoteOrigin: string, handshake: HandshakeFunction) {
    const messenger = new WindowMessenger({
      localWindow: window,
      remoteWindow,
      remoteOrigin,
    });
    handshake(messenger, this.methods).then((connection) => {
      this.connection = connection;
      this.remoteHandle = connection.remoteHandle();
      while (this.queuedRequests.length) {
        const request = this.queuedRequests.shift()
        if (!request) return;
        try {
          const result = this.remoteHandle.call(request.methodName, ...request.args);
          request.resolve(result);
        } catch (error) {
          request.reject(error);
        }
      }
    });
  }

  request(methodName: string, ...args: any[]) {
    if (this.remoteHandle) {
      return this.remoteHandle.call(methodName, ...args);
    }
    return new Promise((resolve, reject) => {
      this.queuedRequests.push({methodName, args, resolve, reject});
    });
  }

  ngOnDestroy(): void {
    this.connection?.close();
    this.connection = undefined;
    this.remoteHandle = undefined;
  }
}

export { PostMeService }
