import logging
from decimal import Decimal, ROUND_CEILING
try:
    from collections import OrderedDict
except ImportError:
    from ordereddict import OrderedDict

log = logging.getLogger(__name__)


def roundUp(i):

    return i.quantize(Decimal('0.1'), rounding=ROUND_CEILING)




class CVSS:

    default_fields = OrderedDict([
        ('AV', OrderedDict(
            [('N', Decimal('0.85')), ('A', Decimal('0.62')), ('L', Decimal('0.55')), ('P', Decimal('0.2'))]
        )),
        ('AC', OrderedDict(
            [('L', Decimal('0.77')), ('H', Decimal('0.44'))]
        )),
        ('PR', OrderedDict(
            [('N', Decimal('0.85')), ('L', Decimal('0.62')), ('H', Decimal('0.27'))]
        )),
        ('UI', OrderedDict(
            [('N', Decimal('0.85')), ('R', Decimal('0.62'))]
        )),
        ('S', OrderedDict(
            [('C', None), ('U', None)]
        )),
        ('C', OrderedDict(
            [('H', Decimal('0.56')), ('L', Decimal('0.22')), ('N', Decimal('0'))]
        )),
        ('I', OrderedDict(
            [('H', Decimal('0.56')), ('L', Decimal('0.22')), ('N', Decimal('0'))]
        )),
        ('A', OrderedDict(
            [('H', Decimal('0.56')), ('L', Decimal('0.22')), ('N', Decimal('0'))]
        )),
        ('E', OrderedDict(
            [('X', Decimal('1')), ('H', Decimal('1')), ('F', Decimal('0.97')), ('P', Decimal('0.94')), ('U', Decimal('0.91'))]
        )),
        ('RL', OrderedDict(
            [('X', Decimal('1')), ('U', Decimal('1')), ('W', Decimal('0.97')), ('T', Decimal('0.96')), ('O', Decimal('0.95'))]
        )),
        ('RC', OrderedDict(
            [('X', Decimal('1')), ('C', Decimal('1')), ('R', Decimal('0.96')), ('U', Decimal('0.92'))]
        )),
        ('CR', OrderedDict(
            [('X', Decimal('1')), ('H', Decimal('1.5')), ('M', Decimal('1')), ('L', Decimal('0.5'))]
        )),
        ('IR', OrderedDict(
            [('X', Decimal('1')), ('H', Decimal('1.5')), ('M', Decimal('1')), ('L', Decimal('0.5'))]
        )),
        ('AR', OrderedDict(
            [('X', Decimal('1')), ('H', Decimal('1.5')), ('M', Decimal('1')), ('L', Decimal('0.5'))]
        )),
        ('MAV', OrderedDict(
            [('X', None), ('N', Decimal('0.85')), ('A', Decimal('0.62')), ('L', Decimal('0.55')), ('P', Decimal('0.2'))]
        )),
        ('MAC', OrderedDict(
            [('X', None), ('L', Decimal('0.77')), ('H', Decimal('0.44'))]
        )),
        ('MPR', OrderedDict(
            [('X', None), ('N', Decimal('0.85')), ('L', Decimal('0.62')), ('H', Decimal('0.27'))]
        )),
        ('MUI', OrderedDict(
            [('X', None), ('N', Decimal('0.85')), ('R', Decimal('0.62'))]
        )),
        ('MS', OrderedDict(
            [('X', None), ('C', None), ('U', None)]
        )),
        ('MC', OrderedDict(
            [('X', None), ('H', Decimal('0.56')), ('L', Decimal('0.22')), ('N', Decimal('0'))]
        )),
        ('MI', OrderedDict(
            [('X', None), ('H', Decimal('0.56')), ('L', Decimal('0.22')), ('N', Decimal('0'))]
        )),
        ('MA', OrderedDict(
            [('X', None), ('H', Decimal('0.56')), ('L', Decimal('0.22')), ('N', Decimal('0'))]
        )),
    ])

    mandatory_fields = ['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A']


    @classmethod
    def fromDict(cls, d):

        return cls(cls.createVector(d))


    def __init__(self, vector):

        self._vector = self.parseVector(vector)
        self._MISS = None
        self._ModifiedImpact = None
        self._ModifiedExploitability = None


    @classmethod
    def createVector(cls, attributeList):

        valueList = OrderedDict()
        for f in cls.default_fields.keys():
            try:
                v = f, attributeList[f]
            except KeyError:
                v = attributeList.get(f'cvss{f}', None)
            if not v and f in cls.mandatory_fields:
                v = cls.defaultChoice(f)

            if v in cls.validChoices(f):
                valueList.update({f:v})
            else:
                assert False, f'Invalid CVSS value: {v}'

        log.debug(f'Created CVSS vector: {valueList}')

        return '/'.join(['CVSS:3.1'] + [f'{k}:{v}' for k,v in valueList.items()])



    def parseVector(self, vector):

        vectorDict = {k:v for k,v in [s.split(':')[:2] for s in vector.split('/')[1:]]}
        vectorDictValidated = OrderedDict()

        for f in self.fieldNames:
            try:
                vectorDictValidated.update({f: vectorDict[f]})
            except KeyError:
                if f in self.mandatory_fields:
                    assert False, f'Missing mandatory CVSS field {f}'

        return vectorDictValidated
        


    @property
    def vector(self):

        return '/'.join(
            ['CVSS:3.1'] + [
                f'{k}:{v}' for k,v in self._vector.items() if v[0].lower() != 'x'
            ]
        )


    @property
    def dict(self):
        '''
        CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:U/C:N/I:L/A:N/E:X/RL:X/RC:X/CR:X/IR:X/AR:X/MAV:X/MAC:X/MPR:X/MUI:X/MS:X/MC:X/MI:X/MA:X
        '''

        return {
            f'cvss{key}': value for (key,value) in self._vector.items()
        }


    @property
    def fieldNames(self):

        return list(self.default_fields.keys())


    @classmethod
    def validChoices(cls, field):

        return list(cls.default_fields[field].keys())


    @classmethod
    def defaultChoice(cls, field):

        return cls.default_fields[field].keys()[0]


    @property
    def score(self):

        if self.MISS <= Decimal('0.0'):
            return 0.0
        else:
            if self._MS == 'U':
                modified = roundUp(min(
                    (self.ModifiedImpact + self.ModifiedExploitability), Decimal('10')
                ))
            else:
                modified = roundUp(min(
                    Decimal('1.08') * (self.ModifiedImpact + self.ModifiedExploitability), Decimal('10')
                ))
            return float(roundUp(modified * self._Ev * self._RLv * self._RCv))


    @property
    def severity(self):
        '''
        Textual severity ratings of None (0), Low (0.1-3.9), Medium (4.0-6.9), High (7.0-8.9), and Critical (9.0-10.0)
        '''

        severities = {
            (9.0, 10.0): "Critical",
            (7.0, 8.9): "High",
            (4.0, 6.9): "Medium",
            (0.1, 3.9): "Low",
            (0.0, 0.0): "Informational"
        }

        for (low, high), severity in severities.items():
            if low <= self.score <= high:
                return severity


    @property
    def MISS(self):

        if self._MISS is None:
            self._MISS = min(
                (
                    Decimal('1') -
                    (Decimal('1') - self._MCv * self._CRv) *
                    (Decimal('1') - self._MIv * self._IRv) *
                    (Decimal('1') - self._MAv * self._ARv)
                ), 
                Decimal('0.915')
            )
        return self._MISS


    @property
    def ModifiedImpact(self):

        if self._ModifiedImpact is None:
            if self._MS == 'U':
                self._ModifiedImpact = Decimal('6.42') * self.MISS
            else:
                self._ModifiedImpact = (
                    Decimal('7.52') * (self.MISS - Decimal('0.029')) -
                    Decimal('3.25') * (self.MISS * Decimal('0.9731') - Decimal('0.02'))
                    ** Decimal('13')
                )
        return self._ModifiedImpact


    @property
    def ModifiedExploitability(self):

        if self._ModifiedExploitability is None:
            self._ModifiedExploitability = (
                Decimal('8.22') * self._MAVv * self._MACv * self._MPRv * self._MUIv
            )
        return self._ModifiedExploitability


    def __getattr__(self, attr):
        '''
        Use _MS to access the key, (e.g. "X")
        Use _MSv to access the value (e.g. None)
        '''

        if attr.startswith('_'):
            try:
                cvss_attr = attr.lstrip('_').rstrip('v')
                s = self._vector.get(cvss_attr, 'X')

                # if the "modified" value isn't set, use the non-modified one
                if cvss_attr.startswith('M') and s == 'X':
                    s = self._vector.get(cvss_attr[1:])

                if not attr.endswith('v'):
                    return s

                else:
                    # This is an exception for "privileges required" if the scope is changed
                    if ((cvss_attr == 'PR' and self._S == 'C') or (cvss_attr == 'MPR' and self._MS == 'C')):
                        result = {'X': None, 'N': Decimal('0.85'), 'L': Decimal('0.68'), 'H': Decimal('0.50')}[s]
                    else:
                        result = self.default_fields[cvss_attr][s]

                    return result

            except KeyError as e:
                pass

        return self.__getattribute__(attr)


    def __str__(self):

        return self.vector


    def __iter__(self):

        for k,v in self.dict.items():
            yield (k,v)