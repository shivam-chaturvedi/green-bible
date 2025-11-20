import {Alert} from 'react-native';

const globalObject = globalThis as any;

let handlersRegistered = false;
let alertVisible = false;

function showAlert(message: string) {
  if (alertVisible) {
    return;
  }
  alertVisible = true;
  Alert.alert('Unexpected issue', message, [
    {
      text: 'OK',
      onPress: () => {
        alertVisible = false;
      },
    },
  ]);
}

export function registerGlobalErrorHandlers() {
  if (handlersRegistered) {
    return;
  }
  handlersRegistered = true;

  const errorUtils = globalObject?.ErrorUtils;
  const defaultHandler = errorUtils?.getGlobalHandler?.();

  if (errorUtils?.setGlobalHandler) {
    errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      console.error('Unhandled JS error', error);
      showAlert('Something went wrong. Please try again.');
      defaultHandler?.(error, isFatal);
    });
  }

  const rejectionHandler = (event: any) => {
    const reason = event?.reason ?? event;
    console.error('Unhandled promise rejection', reason);
    showAlert('We were unable to finish that action. Please retry.');
    event?.preventDefault?.();
  };

  if (typeof globalObject.addEventListener === 'function') {
    globalObject.addEventListener('unhandledrejection', rejectionHandler);
  } else if (typeof globalObject.onunhandledrejection === 'undefined') {
    globalObject.onunhandledrejection = rejectionHandler;
  }
}
