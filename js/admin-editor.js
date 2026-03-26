(function () {
  var ta =
    document.getElementById('project-body') || document.getElementById('post-body');
  if (!ta || typeof CodeMirror === 'undefined') {
    return;
  }
  var editor = CodeMirror.fromTextArea(ta, {
    mode: 'htmlmixed',
    lineNumbers: true,
    lineWrapping: true,
    indentUnit: 2,
    tabSize: 2,
    theme: 'default',
  });
  var form = ta.closest('form');
  if (form) {
    form.addEventListener('submit', function () {
      editor.save();
    });
  }
})();
