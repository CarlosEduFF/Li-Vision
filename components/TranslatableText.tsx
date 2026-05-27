import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { VLibrasController } from './GlobalVLibras';

export default function TranslatableText({ children, onLongPress, ...props }: TextProps) {
  const translate = () => {
    if (typeof children === 'string') {
      VLibrasController.translate(children);
    } else if (Array.isArray(children)) {
      const text = children.filter(c => typeof c === 'string').join(' ');
      VLibrasController.translate(text);
    }
  };

  return (
    <RNText
      {...props}
      onLongPress={(event) => {
        onLongPress?.(event);
        translate();
      }}
    >
      {children}
    </RNText>
  );
}
