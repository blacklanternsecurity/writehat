from .base import *
import plotly.graph_objects as go
from base64 import b64encode


class ChartComponentForm(ComponentForm):

    name = forms.CharField(label='Title', required=False)
    pageBreakBefore = forms.BooleanField(
        label='Start On New Page?', required=False)


class Component(BaseComponent):
    default_name = 'Chart'
    formClass = ChartComponentForm
    htmlTemplate = 'componentTemplates/ChartComponent.html'
    iconType = 'far fa-chart-bar'
    iconColor = '#fff'

    def preprocess(self, context):
        findings = context["report"].findings
        data = {
            "Critical": 0,
            "High": 0,
            "Medium": 0,
            "Low": 0,
            "Informational": 0
        }
        for finding in findings:
            data[finding.severity] += 1

        x = list(data.keys())
        y = list(data.values())

        fig = go.Figure(
            data=[go.Bar(x=x,
                         y=y,
                         text=y,
                         textposition="auto",
                         insidetextanchor="middle",
                         insidetextfont_size=16,
                         marker_color=["#a600ff", "#FF0000",
                                       "#ff711e", "#ffc803", "#4894e0"],
                         textfont=dict(color="white"),
                         width=0.5
                         )],
            # layout_title_text="Number of Findings",
        )
        maxValue = 5 if max(data.values()) < 5 else max(data.values()) + 2
        fig.update_yaxes(range=[0, maxValue], dtick=1)
        b64image = b64encode(fig.to_image(format="svg", width=720))
        context['chartb64'] = b64image.decode()

        return context
