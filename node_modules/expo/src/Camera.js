// @flow

import PropTypes from 'prop-types';
import React from 'react';
import { NativeModules, ViewPropTypes, Platform, requireNativeComponent } from 'react-native';

type PictureOptions = {
  quality?: number,
};

type RecordingOptions = {
  maxDuration?: number,
  maxFileSize?: number,
  quality?: number | string,
};

const CameraManager = NativeModules.ExponentCameraManager || NativeModules.ExponentCameraModule;

// FIX: Define the prop types with Flow properly
type Props = any;

const EventThrottleMs = 500;

export default class Camera extends React.Component<Props> {
  static Constants = {
    Type: CameraManager.Type,
    FlashMode: CameraManager.FlashMode,
    AutoFocus: CameraManager.AutoFocus,
    WhiteBalance: CameraManager.WhiteBalance,
    VideoQuality: CameraManager.VideoQuality,
    BarCodeType: CameraManager.BarCodeType,
  };

  static propTypes = {
    ...ViewPropTypes,
    onCameraReady: PropTypes.func,
    onMountError: PropTypes.func,
    flashMode: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    type: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    ratio: PropTypes.string,
    autoFocus: PropTypes.oneOfType([PropTypes.string, PropTypes.bool, PropTypes.number]),
    focusDepth: PropTypes.number,
    zoom: PropTypes.number,
    whiteBalance: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    barCodeTypes: PropTypes.array,
    onBarCodeRead: PropTypes.func,
  };

  static defaultProps = {
    type: CameraManager.Type.back,
    flashMode: CameraManager.FlashMode.off,
    autoFocus: CameraManager.AutoFocus.on,
    focusDepth: 0,
    ratio: '4:3',
    zoom: 0,
    whiteBalance: CameraManager.WhiteBalance.auto,
    barCodeTypes: Object.values(CameraManager.BarCodeType),
  };

  _lastEvent: ?string;
  _lastEventTime: ?Date;

  async takePictureAsync(options?: PictureOptions) {
    if (!options) {
      options = {};
    }
    if (!options.quality) {
      options.quality = 1;
    }
    return await CameraManager.takePicture(options);
  }

  async getSupportedRatiosAsync() {
    if (Platform.OS === 'android') {
      return await CameraManager.getSupportedRatios();
    } else {
      throw new Error('Ratio is not supported on iOS');
    }
  }

  async recordAsync(options?: RecordingOptions) {
    if (!options || typeof options !== 'object') {
      options = {};
    } else if (typeof options.quality === 'string') {
      options.quality = Camera.Constants.VideoQuality[options.quality];
    }
    return await CameraManager.record(options);
  }

  stopRecording() {
    CameraManager.stopRecording();
  }

  _onCameraReady = () => {
    if (this.props.onCameraReady) {
      this.props.onCameraReady();
    }
  };

  _onMountError = () => {
    if (this.props.onMountError) {
      this.props.onMountError();
    }
  };

  // $FlowFixMe: event needs a type
  _onBarCodeRead = ({ nativeEvent }) => {
    if (
      this._lastEvent &&
      JSON.stringify(nativeEvent) === this._lastEvent &&
      // $FlowFixMe: _lastEventTime is nullable
      new Date() - this._lastEventTime < EventThrottleMs
    ) {
      return;
    }

    if (this.props.onBarCodeRead) {
      this.props.onBarCodeRead(nativeEvent);
      this._lastEvent = JSON.stringify(nativeEvent);
      this._lastEventTime = new Date();
    }
  };

  render() {
    const nativeProps = this._convertNativeProps(this.props);

    return (
      <ExponentCamera
        {...nativeProps}
        onCameraRead={this._onCameraReady}
        onMountError={this._onMountError}
        onBarCodeRead={this._onBarCodeRead}
      />
    );
  }

  _convertNativeProps(props: Props) {
    const newProps = { ...props };
    if (typeof props.flashMode === 'string') {
      newProps.flashMode = Camera.Constants.FlashMode[props.flashMode];
    }

    if (typeof props.type === 'string') {
      newProps.type = Camera.Constants.Type[props.type];
    }

    if (typeof props.autoFocus === 'string') {
      newProps.autoFocus = Camera.Constants.AutoFocus[props.autoFocus];
    }

    if (typeof props.whiteBalance === 'string') {
      newProps.whiteBalance = Camera.Constants.WhiteBalance[props.whiteBalance];
    }

    if (props.onBarCodeRead) {
      newProps.barCodeScannerEnabled = true;
    }

    if (Platform.OS === 'ios') {
      delete newProps.ratio;
    }

    return newProps;
  }
}

export const Constants = Camera.Constants;

const ExponentCamera = requireNativeComponent('ExponentCamera', Camera, {
  nativeOnly: {
    onCameraReady: true,
    onMountError: true,
    onBarCodeRead: true,
    barCodeScannerEnabled: true,
  },
});
