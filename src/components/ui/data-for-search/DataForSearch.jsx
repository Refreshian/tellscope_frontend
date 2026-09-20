import { useEffect, useState } from 'react';
import { fileMeta, hasFileMeta } from '../../../utils/fileMeta';
import { useSelector } from 'react-redux';
import { useActions } from '@/hooks/useActions';
import useClickOutside from '../../../hooks/useClickOutside';
import { truncateMiddle, truncateDescription } from '../../../utils/editText';
import styles from './DataForSearch.module.scss';

const DataForSearch = ({
  multi,
  directory,
  style,
  className,
  onDeleteFile,
  dropdownStatic = false,
  showHtmlFiles = false,
}) => {
  const find_directory = directory === 'bertopic'
    ? 'bertopic_files_directory'
    : 'json_files_directory';

  const [isViewOptions, setViewOptions] = useState(false);
  const { [find_directory]: dataUser } = useSelector(store => store.dataUsersSlice);
  const dataForRequest = useSelector(state => state.dataForRequest);
  const { addIndex, addThemesInd, addIndexDoc_Ai, addNameIndexFile } = useActions();
  const [checkedState, setCheckedState] = useState({});
  const wrapperRef = useClickOutside(() => setViewOptions(false));
  const [selectedOption, setSelectedOption] = useState(null); // Новое состояние для хранения выбранной темы
  // Удаление темы прямо из списка: удалённые прячем сразу, ошибки показываем в самом списке.
  const [removed, setRemoved] = useState([]);
  const [deleteErr, setDeleteErr] = useState('');
  const [deleting, setDeleting] = useState(null);

  const themeName = option => (showHtmlFiles ? option['html-file'] : option.file);
  const isDatasetOption = option => !option['html-file'] && option.index_number != null;

  // Настройки последней проверки тональности — для подсказки у метки: по каким объектам,
  // в каком режиме и когда проверяли.
  const toneDetails = info => {
    if (!info) return '';
    const parts = [];
    const objects = Array.isArray(info.check_objects) ? info.check_objects.filter(Boolean) : [];
    if (objects.length) parts.push('объекты: ' + objects.map(o => '«' + o + '»').join(', '));
    if (info.check_label_mode === 'aspect') parts.push('оценивали отношение к объектам');
    else if (info.check_label_mode === 'message') parts.push('тональность сообщения целиком');
    if (info.check_checked) parts.push('проверено ' + Number(info.check_checked).toLocaleString('ru-RU') + ' сообщ.');
    if (info.check_at) parts.push(String(info.check_at).replace('T', ' ').slice(0, 16));
    return parts.join(' · ');
  };

  // Режим тональности по темам: видно, где тональность уже обновлена нашей разметкой,
  // а где разметка есть, но аналитика пока считает по источнику. Тут же её можно применить.
  const [toneMap, setToneMap] = useState({});
  const [toneBusy, setToneBusy] = useState(null);

  const readToken = () => {
    const match = document.cookie.split('; ').find(x => x.startsWith('token='));
    return match ? decodeURIComponent(match.slice('token='.length)) : '';
  };

  const loadToneModes = async () => {
    try {
      const token = readToken();
      const r = await fetch('/api/tone-check/datasets', {
        headers: token ? { Authorization: 'Bearer ' + token } : {},
      });
      if (!r.ok) return;
      const d = await r.json();
      const map = {};
      (d.datasets || []).forEach(ds => {
        if (ds && ds.index != null) map[ds.index] = ds;
      });
      setToneMap(map);
    } catch (e) {}
  };

  useEffect(() => {
    loadToneModes();
  }, []);

  const toggleToneMode = async (option, on) => {
    setToneBusy(option.index_number);
    setDeleteErr('');
    try {
      const token = readToken();
      const r = await fetch('/api/tone-check/tone-mode', {
        method: 'POST',
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          token ? { Authorization: 'Bearer ' + token } : {},
        ),
        body: JSON.stringify({ index: String(option.index_number), mode: on ? 'relabeled' : 'source' }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setDeleteErr(d.detail || 'Не удалось переключить режим тональности');
        return;
      }
      await loadToneModes();
    } catch (e) {
      setDeleteErr('Не удалось переключить режим тональности: нет связи с сервером');
    } finally {
      setToneBusy(null);
    }
  };

  const deleteTheme = async (option, folderPath) => {
    const name = themeName(option);
    const label = String(name || '').replace(/\.json$/i, '');
    if (!isDatasetOption(option) && onDeleteFile) {
      onDeleteFile(name, folderPath);
      return;
    }
    if (!isDatasetOption(option)) {
      setDeleteErr('Такую тему удаляют из папки в разделе «Наборы данных».');
      return;
    }
    const ok = window.confirm(
      'Удалить тему «' + label + '»?\n\n' +
        'Сообщения этой темы и результаты разметки удаляются безвозвратно. ' +
        'Отчёты, уже сохранённые в папке «Отчёты», останутся.',
    );
    if (!ok) return;
    setDeleting(option.index_number);
    setDeleteErr('');
    try {
      const match = document.cookie.split('; ').find(x => x.startsWith('token='));
      const token = match ? decodeURIComponent(match.slice('token='.length)) : '';
      const r = await fetch('/api/tone-check/datasets/' + encodeURIComponent(option.index_number), {
        method: 'DELETE',
        headers: token ? { Authorization: 'Bearer ' + token } : {},
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setDeleteErr(d.detail || 'Не удалось удалить тему (код ' + r.status + ')');
        return;
      }
      setRemoved(prev => [...prev, option.index_number]);
      if (selectedOption === name) setSelectedOption(null);
    } catch (e) {
      setDeleteErr('Не удалось удалить тему: нет связи с сервером');
    } finally {
      setDeleting(null);
    }
  };

  const buildFolderStructure = (data) => {
    const structure = {};
    Object.entries(data).forEach(([folderPath, files]) => {
      const pathParts = folderPath.split('/').filter(part => part.trim() !== '');
      let currentLevel = structure;

      pathParts.forEach((part, index) => {
        if (!currentLevel[part]) {
          currentLevel[part] = index === pathParts.length - 1  
            ? { _files: files } 
            : {};
        }
        currentLevel = currentLevel[part];
      });
    });
    return structure;
  };

  const renderFolderStructure = (structure, level = 0, folderPath = '') => {
    return Object.entries(structure).map(([name, content]) => {
      if (name === '_files') {
        const filteredFiles = showHtmlFiles 
          ? content.filter(option => option['html-file'])
          : content.filter(option => !option['html-file']);
        const visibleFiles = filteredFiles.filter(
          option => !removed.includes(option.index_number),
        );
        
        return visibleFiles.map(option => (
          <div
            key={option.file}
            className={styles.option}
            style={{ paddingLeft: `${20 + (level * 15)}px` }}
          >
            <div className={styles.optionContent} onClick={() => onClick(option)}>
              {multi && (
                <input
                  type='checkbox'
                  checked={checkedState[option.index_number] || false}
                  onChange={e => e.preventDefault()}
                />
              )}
              <p>
                {directory === 'bertopic'
                  ? (showHtmlFiles ? option['html-file'] : option.file)
                  : (showHtmlFiles ? option['html-file'] : option.file)}
              </p>
              {hasFileMeta(option) ? (
                <div style={{ color: '#98a2b3', fontSize: 11, marginTop: 2, maxWidth: '100%', overflowWrap: 'anywhere', wordBreak: 'break-word', lineHeight: 1.35 }}>
                  {fileMeta(option)}
                </div>
              ) : null}

            </div>
            {toneMap[option.index_number] && Number(toneMap[option.index_number].labeled) > 0 && (() => {
              const info = toneMap[option.index_number];
              const applied = Number(info.tone_applied || 0);
              const labeled = Number(info.labeled || 0);
              const partial = info.tone_mode === 'relabeled' && applied < labeled;
              const details = toneDetails(info);
              const objects = Array.isArray(info.check_objects) ? info.check_objects.filter(Boolean) : [];
              if (toneBusy === option.index_number) {
                return <span style={{ color: '#667085', fontSize: 11, flex: '0 0 auto' }}>…</span>;
              }
              if (info.tone_mode === 'relabeled' && !partial) {
                return (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
                    <span
                      title={
                        'Аналитика считает по нашей разметке: перенесено ' + applied + ' сообщений' +
                        (details ? '\n\nПроверка: ' + details : '')
                      }
                      style={{ color: '#067647', background: '#ecfdf3', border: '1px solid #abefc6', borderRadius: 999, padding: '1px 8px', fontSize: 11, whiteSpace: 'nowrap' }}
                    >
                      тональность обновлена
                    </span>
                    {objects.slice(0, 3).map(o => (
                      <span
                        key={o}
                        title={'Объект из проверки тональности: «' + o + '»'}
                        style={{ color: '#1760e8', background: '#eef2ff', border: '1px solid #c7d7fe', borderRadius: 999, padding: '1px 8px', fontSize: 11, whiteSpace: 'nowrap' }}
                      >
                        {o}
                      </span>
                    ))}
                    <button
                      type='button'
                      title='Вернуть разметку источника'
                      onClick={e => { e.stopPropagation(); toggleToneMode(option, false); }}
                      style={{ background: 'none', border: 'none', color: '#667085', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                    >
                      вернуть
                    </button>
                  </span>
                );
              }
              return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
                  <span
                    title={(partial
                      ? 'Перенос не закончен: перенесено ' + applied + ' из ' + labeled + ' сообщений с нашей разметкой'
                      : 'Наша разметка есть у ' + labeled + ' из ' + Number(info.docs || 0) + ' сообщений, но разделы пока считают по источнику') +
                      (details ? '\n\nПроверка: ' + details : '')}
                    style={{ color: '#b54708', background: '#fffaeb', border: '1px solid #fedf89', borderRadius: 999, padding: '1px 8px', fontSize: 11, whiteSpace: 'nowrap' }}
                  >
                    {partial ? 'обновлено ' + applied + ' из ' + labeled : 'размечено ' + labeled}
                  </span>
                  {objects.slice(0, 3).map(o => (
                    <span
                      key={o}
                      title={'Объект из проверки тональности: «' + o + '»'}
                      style={{ color: '#1760e8', background: '#eef2ff', border: '1px solid #c7d7fe', borderRadius: 999, padding: '1px 8px', fontSize: 11, whiteSpace: 'nowrap' }}
                    >
                      {o}
                    </span>
                  ))}
                  <button
                    type='button'
                    title={partial ? 'Довести перенос до конца' : 'Считать по нашей разметке во всех разделах'}
                    onClick={e => { e.stopPropagation(); toggleToneMode(option, true); }}
                    style={{ background: 'none', border: '1px solid #F79009', color: '#b54708', borderRadius: 6, fontSize: 11, cursor: 'pointer', padding: '1px 6px' }}
                  >
                    {partial ? 'дополнить' : 'применять'}
                  </button>
                </span>
              );
            })()}
            <button
              type='button'
              className={styles.deleteButton}
              title='Удалить тему'
              disabled={deleting === option.index_number}
              onClick={(e) => {
                e.stopPropagation();
                deleteTheme(option, folderPath);
              }}
            >
              {deleting === option.index_number
                ? '…'
                : <img src="/images/icons/setting/delete_active.svg" alt="Удалить тему" />}
            </button>
          </div>
        ));
      }

      const currentPath = folderPath ? `${folderPath}/${name}` : name;

      return (
        <div key={name}>
          <h3
            className={styles.groupTitle}
            style={{ paddingLeft: `${10 + (level * 15)}px` }}
          >
            {name}
          </h3>
          {renderFolderStructure(content, level + 1, currentPath)}
        </div>
      );
    });
  };

  const arrayData = dataUser && Object.keys(dataUser).length > 0
    ? buildFolderStructure(dataUser)
    : {};

  const onClick = (option) => {
    if (multi) {
      addThemesInd(option.index_number);
    } else {
      addIndex(option.index_number);
      setViewOptions(!isViewOptions);
      // Сохраняем выбранную опцию
      setSelectedOption(showHtmlFiles ? option['html-file'] : option.file);

      if (directory === 'bertopic') {
        addIndexDoc_Ai(option.index_number);
        addNameIndexFile(showHtmlFiles ? option['html-file'] : option.file);
      }
    }
  };

  const findTargetFileMulti =
    dataForRequest.themes_ind.length > 0
      ? Object.values(arrayData)
          .flat()
          .find(file => 
              dataForRequest.themes_ind.includes(file.index_number) && 
              !file['html-file']
          )
      : undefined;

  const findTargetFileMultiDouble =
    dataForRequest.themes_ind.length === 2
      ? Object.values(arrayData)
          .flat()
          .filter(
              el =>
                  (el.index_number === dataForRequest.themes_ind[0] ||
                  el.index_number === dataForRequest.themes_ind[1]) &&
                  !el['html-file']
          )
      : undefined;

  const findTargetFile =
    dataForRequest.index !== undefined
      ? Object.values(arrayData)
          .flat()
          .find(file => 
              file.index_number === dataForRequest.index && 
              (showHtmlFiles ? file['html-file'] : !file['html-file'])
          )
      : undefined;

  const nameFile = multi
    ? findTargetFileMultiDouble
        ? `${truncateDescription(findTargetFileMultiDouble[0]?.file || '', 15)} - ${truncateDescription(findTargetFileMultiDouble[1]?.file || '', 15)}`
        : findTargetFileMulti?.file || ''
    : (showHtmlFiles ? findTargetFile?.['html-file'] : findTargetFile?.file) || '';

  const numLength = multi ? 26 : 30;

  return (
    <div
      className={`${styles.wrapper_data} ${className ? className : ''}`}
      ref={wrapperRef}
      style={{ style, position: 'relative' }}
    >
      <div
        className={styles.block__data}
        onClick={() => setViewOptions(!isViewOptions)}
      >
        <div className={styles.block__description}>
          {/* Показываем выбранную тему или стандартный текст */}
          {selectedOption || nameFile ? (
            <p className={styles.selectedOption}>
              {directory === 'bertopic'
                ? selectedOption || nameFile
                : truncateDescription(selectedOption || nameFile, 30)}
            </p>
          ) : (
            <h2>Выберите тему</h2>
          )}
        </div>
        <img
          className={styles.data__arrow}
          src='/images/icons/arrow_for_search.svg'
          alt='arrow'
        />
      </div>
      {isViewOptions && (
        <div
          className={`
            ${styles.block__options} 
            ${dropdownStatic ? styles.block__options__static : ''}
          `}
        >
          {renderFolderStructure(arrayData)}
          {deleteErr && (
            <div style={{ color: '#b42318', padding: '6px 10px', fontSize: 12 }}>{deleteErr}</div>
          )}
          {!deleteErr && (
            <div style={{ color: '#98a2b3', padding: '6px 10px 2px', fontSize: 11 }}>
              Корзина удаляет данные и фильтры по ним
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataForSearch;