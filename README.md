# angular-post-me-service

Angular service using the post-me library for bidirectional communication between browser windows/frames via window.postMessage

## Installation

```sh
npm install angular-post-me-service
```

## Usage

### Parent Window

```typescript
import PostMeService from 'angular-post-me-service';
import { ElementRef, OnDestroy } from "@angular/core";

export class SomeComponent implements OnDestroy {
  @ViewChild('iframe') iframeRef: ElementRef;

  constructor(private postMeService: PostMeService) {
    this.postMessageService.registerMethod('add', async (a: number, b: number) => {
      return a + b;
    });
    const {origin} = window.location;
    this.postMessageService.connectToChildWindow(
      this.iframeRef.nativeElement.contentWindow,
      origin,
    ).then(connection => {
      connection?.request('subtract', 6, 2).then(result => {
        console.log(result);  // 4
      });
    });
  }

  ngOnDestroy() {
    this.postMeService.unregisterMethod('add');
  }
}
```

### Child Window (e.g. iframe)

```typescript
import PostMeService from 'angular-post-me-service';
import { ElementRef, OnDestroy } from "@angular/core";

export class SomeComponent implements OnDestroy {
  @ViewChild('iframe') iframeRef: ElementRef;

  constructor(private postMeService: PostMeService) {
    this.postMessageService.registerMethod('subtract', async (a: number, b: number) => {
      return a - b;
    });
    const {origin} = window.location;
    this.postMessageService.connectToParentWindow(parent, origin).then(connection => {
      connection?.request('add', 6, 2).then(result => {
        console.log(result);  // 8
      });
    });
  }

  ngOnDestroy() {
    this.postMeService.unregisterMethod('subtract');
  }
}
```
