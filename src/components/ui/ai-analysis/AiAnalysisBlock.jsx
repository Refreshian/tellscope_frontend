import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

import styles from './AiAnalysisBlock.module.scss';

const AiAnalysisBlock = ({
  visibleCount,
  totalCount,
  unit = 'упоминаний',
  extraNote,
  suggestions = [],
  showInput,
  onToggle,
  query,
  onQueryChange,
  onSubmit,
  loading,
  error,
  analysis,
  extraControls,
  loadingNode,
}) => {
  const hasFilter = Number(totalCount) > 0 && Number(visibleCount) !== Number(totalCount);

  return (
    <div className={styles.block} id="ai-analysis">
      {!showInput && (
        <div className={styles.hint}>
          <div>
            <strong>Можно спросить ИИ по этим графикам</strong>
            <p>
              Анализ идёт по текущей выборке
              {hasFilter
                ? `: ${Number(visibleCount).toLocaleString('ru-RU')} из ${Number(totalCount).toLocaleString('ru-RU')} ${unit}`
                : ` · ${Number(visibleCount || 0).toLocaleString('ru-RU')} ${unit}`}
              {extraNote ? ` · ${extraNote}` : ''}.
            </p>
          </div>
          <button type="button" className={styles.analyzeButton} onClick={onToggle}>
            Проанализировать данные через ИИ
          </button>
        </div>
      )}

      {showInput && (
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <strong>Вопрос к текущей выборке</strong>
              <p>
                {hasFilter
                  ? `Учитываются фильтры: ${Number(visibleCount).toLocaleString('ru-RU')} из ${Number(totalCount).toLocaleString('ru-RU')} ${unit}`
                  : `${Number(visibleCount || 0).toLocaleString('ru-RU')} ${unit} на экране`}
                {extraNote ? ` · ${extraNote}` : ''}
              </p>
            </div>
            <button type="button" className={styles.hideButton} onClick={onToggle}>
              Скрыть
            </button>
          </div>

          {suggestions.length > 0 && (
            <div className={styles.chips}>
              {suggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={styles.chip}
                  onClick={() => onQueryChange(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          <textarea
            className={styles.textarea}
            placeholder="Спросите, например: какие источники выделяются и почему?"
            rows={4}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <div className={styles.controls}>
            {extraControls}
            <button
              type="button"
              className={styles.sendButton}
              onClick={onSubmit}
              disabled={loading}
            >
              {loading ? 'Анализируем…' : 'Отправить запрос'}
            </button>
          </div>
          {loading && (
            <div className={styles.loading}>
              {loadingNode}
              <p>Смотрим только то, что сейчас на графиках. Обычно это меньше минуты.</p>
            </div>
          )}
          {error && (
            <div className={styles.error}>
              <p>Ошибка: {error}</p>
            </div>
          )}
          {analysis && (
            <div className={styles.response}>
              <h4>Результаты анализа</h4>
              <div className={styles.responseContent}>
                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                  {analysis}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AiAnalysisBlock;
