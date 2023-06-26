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
export default class PostMessageService implements OnDestroy {
  private connection?: Connection;
  private remoteHandle?: RemoteHandle;
  private queuedRequests: QueuedRequest[];
  private methods: MethodsType;

  constructor() {
    this.methods = {};
    this.queuedRequests = [];
  }

  registerMethod(methodName: string, method: MethodsType[string]): void {
    this.methods[methodName] = method;
  }

  registerMethods(methods: MethodsType): void {
    Object.assign(this.methods, methods);
  }

  unregisterMethod(methodName: string): void {
    delete this.methods[methodName];
  }

  connectToChildWindow(remoteWindow: Window, remoteOrigin: string, ...args: any): Promise<Connection | undefined> {
    this.disconnect();
    const handshake = (messenger: WindowMessenger, methods?: MethodsType) => (
      ParentHandshake(messenger, methods, ...args)
    );
    return this.connectToWindow(remoteWindow, remoteOrigin, handshake);
  }

  connectToParentWindow(remoteWindow: Window, remoteOrigin: string): Promise<Connection | undefined> {
    this.disconnect();
    return this.connectToWindow(remoteWindow, remoteOrigin, ChildHandshake);
  }

  private connectToWindow(remoteWindow: Window, remoteOrigin: string, handshake: HandshakeFunction): Promise<Connection | undefined> {
    const messenger = new WindowMessenger({
      localWindow: window,
      remoteWindow,
      remoteOrigin,
    });
    return handshake(messenger, this.methods).then(async (connection) => {
      this.connection = connection;
      this.remoteHandle = connection.remoteHandle();
      while (this.queuedRequests.length) {
        const request = this.queuedRequests.shift()
        if (!request) return;
        try {
          const result = await this.remoteHandle.call(request.methodName, ...request.args);
          request.resolve(result);
        } catch (error) {
          request.reject(error);
        }
      }
      return connection;
    });
  }

  request(methodName: string, ...args: any[]): Promise<any> {
    if (this.remoteHandle) {
      return this.remoteHandle.call(methodName, ...args);
    }
    return new Promise((resolve, reject) => {
      this.queuedRequests.push({methodName, args, resolve, reject});
    });
  }

  disconnect(): void {
    if (!this.connection) return;
    this.connection.close();
    this.connection = undefined;
    this.remoteHandle = undefined;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}

export {
  PostMessageService,
  Connection,
}
