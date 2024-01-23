import classnames from 'classnames';
import css from './layout.module.css';

export function FullCenter(props: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>) {
  return (
    <div {...props} className={classnames(css.fullCenterOuter, props.className)}>
      <div className={css.fullCenterInner}>{props.children}</div>
    </div>
  );
}

export function Stack(props: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>) {
  return (
    <div {...props} className={classnames(css.stack, props.className)}>
      {props.children}
    </div>
  );
}
