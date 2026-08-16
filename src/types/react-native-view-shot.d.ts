declare module 'react-native-view-shot' {
  import React from 'react';
  import { ViewProps } from 'react-native';

  export interface ViewShotOptions {
    format?: 'png' | 'jpg' | 'jpeg' | 'webm';
    quality?: number;
    result?: 'tmpfile' | 'base64' | 'data-uri' | 'zip-base64';
    snapshotContentContainer?: boolean;
    width?: number;
    height?: number;
  }

  export interface ViewShotProps extends ViewProps {
    options?: ViewShotOptions;
    captureMode?: 'mount' | 'continuous' | 'update';
    onCapture?: (uri: string) => void;
    onCaptureFailure?: (error: Error) => void;
    children?: React.ReactNode;
  }

  export default class ViewShot extends React.Component<ViewShotProps> {
    capture?: () => Promise<string>;
  }

  export function captureRef(
    viewRef: any,
    options?: ViewShotOptions
  ): Promise<string>;
}
