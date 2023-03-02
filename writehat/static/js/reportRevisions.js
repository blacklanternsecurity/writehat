$(document).ready(function() {
   function diff2HtmlGenerate(unifiedDiff){
      var diffHtml = Diff2Html.html(unifiedDiff,{drawFileList: false, matching: 'words', outputFormat: 'line-by-line',});
      var jHtmlObject = $(diffHtml);
      jHtmlObject.find(".d2h-file-header").remove();
      var diffHtmlNew = jHtmlObject.html();
      return diffHtmlNew
   }

   $('.revision').click(function() {
      let revision = $(this)
      let [field_name, version] = revision.attr('version').split('-')
      let parent = revision.attr('parent')
      let is_component = revision.attr('component') == "True"
      let previous_version = $('.report-revisions li[version="' + field_name + '-' + (version - 1) + '"][parent="' + parent + '"]')
      let editor = revision.find('.revision-editor').text().trim()
      let name = revision.find('.revision-name').text().trim()

      let data = {
         uuid: parent,
         isComponent: is_component,
         toVersion: version,
         currentText: "",
         fieldName: field_name
      }

      console.log(data)

      if (previous_version.length > 0) {
         data.fromVersion = (version - 1).toString()
      } else {
         data.fromVersion = "-1"
      }

      loadModal('reportRevisionsDiff', function(modal) {
         modal = $(modal)
         modal.modal('show')
         let revision_summary = $('#revision-summary')
         let revision_diff = $('#revision-diff')

         $.ajax({
            type: "POST",
            url: '/revisions/compare',
            data: data,
            success: function(result) {
               var diff = atob(result.unifiedDiff.replace(/_/g, '/').replace(/-/g, '+'));
               let type = is_component ? "component" : "finding"
               let summary = editor + ' made changes to "' + field_name + '" for the "' + name + '" ' + type
               revision_summary.html(summary)
               revision_diff.html(diff2HtmlGenerate(diff))
            },
            error: function(err) {
               modal.html("OOF")
            }
         })
      })
   })
})
